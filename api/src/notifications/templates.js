// In-app + email copy per locale. title/body are stored on the Notification in the user's locale at creation time.
const STATUS = { en: { waiting_on_customer: 'waiting on you', resolved: 'resolved' }, hi: { waiting_on_customer: 'आपके जवाब का इंतज़ार', resolved: 'हल हो गया' } };

export const TEXT = {
  en: {
    agent_reply: ({ number, preview }) => ({ title: `New reply on ${number}`, body: preview }),
    ai_answer: ({ number }) => ({ title: `The AI assistant answered ${number}`, body: 'Check the answer and accept it if it solves your issue.' }),
    status: ({ number, status }) => (status === 'resolved'
      ? { title: `${number} was resolved`, body: 'Tell us how we did.' }
      : { title: `${number} is ${STATUS.en[status] ?? status}`, body: 'The agent needs more information from you.' }),
    sla_breach: ({ number }) => ({ title: `${number} is taking longer than promised`, body: 'We have flagged it to the team as a priority.' }),
  },
  hi: {
    agent_reply: ({ number, preview }) => ({ title: `${number} पर नया जवाब`, body: preview }),
    ai_answer: ({ number }) => ({ title: `AI असिस्टेंट ने ${number} का जवाब दिया है`, body: 'जवाब देखें, और अगर इससे समस्या हल हो गई हो तो उसे स्वीकार करें।' }),
    status: ({ number, status }) => (status === 'resolved'
      ? { title: `${number} हल हो गया है`, body: 'हमें बताएँ कि हमारी सेवा कैसी रही।' }
      : { title: `${number}: ${STATUS.hi[status] ?? status}`, body: 'एजेंट को आपसे कुछ और जानकारी चाहिए।' }),
    sla_breach: ({ number }) => ({ title: `${number} में वादे से ज़्यादा समय लग रहा है`, body: 'हमने इसे टीम के पास प्राथमिकता से भेज दिया है।' }),
  },
};

const EMAIL = {
  en: ({ name, title, body, ticketUrl, unsubUrl }) =>
    `Hi ${name},\n\n${title}.\n${body ? `${body}\n` : ''}\nOpen your ticket: ${ticketUrl}\n\nSmartCC Support\n\nDon't want these emails? Unsubscribe: ${unsubUrl}\n`,
  hi: ({ name, title, body, ticketUrl, unsubUrl }) =>
    `नमस्ते ${name},\n\n${title}।\n${body ? `${body}\n` : ''}\nअपना टिकट खोलें: ${ticketUrl}\n\nSmartCC सपोर्ट\n\nये ईमेल नहीं चाहिए? सदस्यता छोड़ें: ${unsubUrl}\n`,
};

export function email(locale, v) {
  return { subject: `SmartCC: ${v.title}`, text: (EMAIL[locale] ?? EMAIL.en)(v) };
}

export const UNSUBSCRIBED_PAGE = {
  en: '<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsubscribed</title><h1>You are unsubscribed</h1><p>SmartCC will no longer email you about tickets. You can turn emails back on in your profile.</p></html>',
  hi: '<!doctype html><html lang="hi"><meta charset="utf-8"><title>सदस्यता छोड़ी गई</title><h1>आपकी सदस्यता छोड़ दी गई है</h1><p>SmartCC अब आपको टिकट से जुड़े ईमेल नहीं भेजेगा। आप प्रोफ़ाइल में जाकर ईमेल फिर से चालू कर सकते हैं।</p></html>',
  invalid: '<!doctype html><html lang="en"><meta charset="utf-8"><title>Invalid link</title><h1>This unsubscribe link is not valid</h1></html>',
};

// Sign-in code (OTP) email + SMS text. The code is in the subject so it shows in the inbox preview.
export const OTP = {
  en: (code) => ({ subject: `${code} is your SmartCC sign-in code`,
    text: `Your SmartCC sign-in code is ${code}.\n\nIt expires in 10 minutes. Never share it with anyone, including our support team.\n\nIf you did not ask for this code, you can ignore this email.\n\nSmartCC Support\n`,
    sms: `${code} is your SmartCC sign-in code. It expires in 10 minutes. Do not share it with anyone.` }),
  hi: (code) => ({ subject: `${code} आपका SmartCC साइन-इन कोड है`,
    text: `आपका SmartCC साइन-इन कोड ${code} है।\n\nयह 10 मिनट में समाप्त हो जाएगा। इसे किसी के साथ साझा न करें, हमारी सपोर्ट टीम के साथ भी नहीं।\n\nअगर आपने यह कोड नहीं माँगा था, तो इस ईमेल को अनदेखा करें।\n\nSmartCC सपोर्ट\n`,
    sms: `${code} आपका SmartCC साइन-इन कोड है। यह 10 मिनट में समाप्त होगा। इसे किसी को न बताएँ।` }),
};
