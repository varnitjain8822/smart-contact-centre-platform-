// Seed 50 realistic mock conversations per company into both MongoDB and Chatwoot
import mongoose from 'mongoose';
import { cfg } from '../src/config.js';
import * as cw from '../src/chatwoot/client.js';
import { inboxFor } from '../src/chatwoot/inboxes.js';
import { Company } from '../src/models/Company.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { Message } from '../src/models/Message.js';
import { nextTicketNumber } from '../src/models/Counter.js';
import * as sla from '../src/sla/sla.js';
import { SCENARIOS } from './mock-data.js';

await mongoose.connect(cfg.MONGO_URL);
console.log('Connected to MongoDB');

const companies = await Company.find({});
console.log(`Found ${companies.length} companies to seed`);

for (const company of companies) {
  const slug = company.slug;
  const scenarios = SCENARIOS[slug] || [];
  if (!scenarios.length) {
    console.warn(`No scenarios found for company slug: ${slug}, skipping`);
    continue;
  }

  const { inboxId, teamId } = inboxFor(slug);
  console.log(`\n========================================================`);
  console.log(`Seeding 50 mock conversations for ${company.name} (${slug}) -> Inbox ${inboxId}`);
  console.log(`========================================================`);

  // Get demo users for this company
  let users = await User.find({ companyId: company._id });
  if (!users.length) {
    // Fallback: any users or create a customer
    users = await User.find({ role: 'customer' }).limit(5);
  }
  if (!users.length) {
    console.error(`No users found for company ${slug}`);
    continue;
  }

  // Ensure every user has a Chatwoot contact for this inbox
  const contactRefs = [];
  for (const user of users) {
    try {
      let ref = user.chatwoot?.sourceId ? user.chatwoot : null;
      if (!ref) {
        ref = await cw.findContactByIdentifier(String(user._id), inboxId, user.email)
          || await cw.createContact({ name: user.name, email: user.email, identifier: String(user._id), inboxId });
        await User.updateOne({ _id: user._id }, { $set: { chatwoot: ref } });
      } else {
        // Ensure contact has contact_inbox for this company's inbox
        ref = await cw.findContactByIdentifier(String(user._id), inboxId, user.email) || ref;
      }
      contactRefs.push({ user, ref });
    } catch (e) {
      console.warn(`Failed ensuring contact for user ${user.name}:`, e.message);
    }
  }

  if (!contactRefs.length) {
    console.error(`No contact refs available for ${slug}`);
    continue;
  }

    const targetCount = 50;
    const existingCount = await Ticket.countDocuments({ companyId: company._id });
    if (existingCount >= targetCount) {
      console.log(`${company.name} already has ${existingCount} tickets (target: ${targetCount}). Skipping.`);
      continue;
    }

    const needed = targetCount - existingCount;
    console.log(`${company.name} currently has ${existingCount} tickets. Seeding remaining ${needed} conversations to reach ${targetCount}...`);
    let createdCount = 0;

    for (let i = 0; i < needed; i++) {
      const scenarioIdx = (existingCount + i) % scenarios.length;
      const sc = scenarios[scenarioIdx];
      const { user, ref } = contactRefs[i % contactRefs.length];
      const ticketNumber = await nextTicketNumber();

      // Spread createdAt over past 14 days
      const daysAgo = Math.floor(Math.random() * 12) + (i % 2 === 0 ? 0 : 1);
      const hoursAgo = Math.floor(Math.random() * 24);
      const createdAt = new Date(Date.now() - (daysAgo * 86400000 + hoursAgo * 3600000));
      const now = new Date(createdAt.getTime() + 15 * 60000); // 15 mins after creation

      const due = sla.dueDates(createdAt, sc.priority, company.slaOverride);
      const validStatuses = ['ai_handling', 'in_progress', 'waiting_on_customer', 'resolved'];
      const ticketStatus = validStatuses.includes(sc.status) ? sc.status : 'in_progress';
      const isResolved = ticketStatus === 'resolved';
      const isInProgress = ticketStatus === 'in_progress';

    // 1. Create Conversation in Chatwoot
    let convId = null;
    try {
      const conv = await cw.createConversation({
        sourceId: ref.sourceId,
        contactId: ref.contactId,
        ticketNumber,
        slaDueAt: due.resolutionDueAt.toISOString(),
        content: `${sc.subject}\n\n${sc.description}`,
        inboxId,
        teamId,
        company: company.name,
      });
      convId = conv?.id;

      if (convId) {
        // Toggle Priority in Chatwoot
        const cwPriority = sc.priority === 'critical' ? 'urgent' : sc.priority;
        await cw.togglePriority(convId, cwPriority).catch(() => {});

        // Set Custom Attributes
        await cw.setCustomAttributes(convId, {
          ticket_number: ticketNumber,
          ai_tier: sc.tier,
          ai_confidence: sc.confidence,
          ai_summary: sc.subject,
          company: company.name,
        }).catch(() => {});

        // If ticket has agent/AI reply, post it to Chatwoot
        if (sc.reply) {
          await cw.createMessage(convId, {
            content: sc.reply,
            messageType: 'outgoing',
          }).catch(() => {});
        }

        // Set status in Chatwoot
        const targetCwStatus = isResolved ? 'resolved' : (isInProgress ? 'open' : 'pending');
        await cw.toggleStatus(convId, targetCwStatus).catch(() => {});
      }
    } catch (e) {
      console.warn(`[${ticketNumber}] Chatwoot conv creation note:`, e.message);
    }

    // 2. Create Ticket in MongoDB
    const statusHistory = [
      { status: 'ai_handling', at: createdAt, by: 'customer' },
    ];
    if (isInProgress) {
      statusHistory.push({ status: 'in_progress', at: now, by: sc.tier === 'human' ? 'ai' : 'agent' });
    } else if (isResolved) {
      statusHistory.push({ status: 'in_progress', at: now, by: 'ai' });
      statusHistory.push({ status: 'resolved', at: new Date(now.getTime() + 30 * 60000), by: sc.tier === 'auto' ? 'customer' : 'agent' });
    }

    const ticket = new Ticket({
      number: ticketNumber,
      companyId: company._id,
      customerId: user._id,
      subject: sc.subject,
      description: sc.description,
      channel: 'portal',
      customerCategory: sc.category,
      category: sc.category,
      priority: sc.priority,
      status: ticketStatus,
      locale: sc.locale || 'en',
      resolutionType: isResolved ? (sc.tier === 'auto' ? 'ai' : 'human') : null,
      resolvedAt: isResolved ? new Date(now.getTime() + 30 * 60000) : null,
      lastMessageAt: isResolved ? new Date(now.getTime() + 30 * 60000) : now,
      sla: {
        responseDueAt: due.responseDueAt,
        resolutionDueAt: due.resolutionDueAt,
        firstResponseAt: sc.reply ? now : null,
      },
      ai: {
        tier: sc.tier,
        confidence: sc.confidence,
        intent: sc.intent || 'support_inquiry',
        summary: sc.subject,
        triggers: sc.priority === 'critical' ? ['security'] : [],
        autoCount: sc.tier === 'auto' ? 1 : 0,
        awaitingAcceptance: sc.status === 'ai_handling' && sc.tier === 'auto',
      },
      chatwoot: {
        conversationId: convId,
        syncState: convId ? 'synced' : 'pending',
      },
      statusHistory,
      createdAt,
      updatedAt: isResolved ? new Date(now.getTime() + 30 * 60000) : now,
    });

    if (isResolved) {
      ticket.csat = {
        rating: Math.random() > 0.15 ? (Math.random() > 0.3 ? 5 : 4) : 3,
        comment: Math.random() > 0.4 ? 'Prompt and helpful resolution!' : '',
        submittedAt: new Date(now.getTime() + 45 * 60000),
      };
    }

    await ticket.save();

    // 3. Create Messages in MongoDB
    // Message 1: Customer opener
    await Message.create({
      ticketId: ticket._id,
      author: 'customer',
      authorName: user.name,
      body: sc.description,
      syncState: 'sent',
      createdAt,
    });

    // Message 2: Reply if applicable
    if (sc.reply) {
      await Message.create({
        ticketId: ticket._id,
        author: sc.tier === 'auto' ? 'ai' : 'agent',
        authorName: sc.tier === 'auto' ? 'SmartCC AI' : 'Support Specialist',
        body: sc.reply,
        syncState: 'sent',
        createdAt: now,
      });
    }

    createdCount++;
    process.stdout.write(`.`);
    if (createdCount % 10 === 0) {
      console.log(` [${createdCount}/${targetCount}]`);
    }
  }

  console.log(`\nSuccessfully created ${createdCount} conversations for ${company.name}!`);
}

console.log('\nAll companies seeded successfully!');
await mongoose.disconnect();
process.exit(0);
