import { KbArticle } from '../models/KbArticle.js';
import { KbTranslation } from '../models/KbTranslation.js';

// Adapted from the reference prototype's seedData.js, rewritten as plain text (paragraphs separated by blank lines).
export const ARTICLES = [
  { slug: 'password-reset', category: 'Account', title: 'Password Reset Guide & Troubleshooting',
    keywords: ['password', 'reset', 'forgot password', 'login', 'locked out', 'sign in'],
    body: 'You can reset your password with the "Forgot password" option on the sign-in page. We send a reset link to your registered email; open it and choose a new password.\n\nIf the email does not arrive within 5 minutes, check your spam or promotions folder, then request a new link. Only the most recent link works.\n\nIf you are locked out after several failed attempts, wait 15 minutes before trying again.' },
  { slug: 'otp-not-received', category: 'Account', title: 'Login Verification Code (OTP) Not Received',
    keywords: ['verification code', 'otp', '2fa', 'login', 'not coming', 'arriving', 'code'],
    body: 'Verification codes (OTP) can take up to 2 minutes to arrive.\n\nCheck that you are looking at the phone number or email registered on your account, and check your spam folder.\n\nWait a few minutes before using "Resend code"; requesting many codes in a row can delay delivery. Never share your OTP with anyone, including our support team.' },
  { slug: 'update-email-profile', category: 'Account', title: 'Updating Your Registered Email & Profile',
    keywords: ['change email', 'update email', 'registered email', 'profile', 'account details', 'name'],
    body: 'Go to Settings → Account and select "Change email". We send a verification link to the new address; the change takes effect once you confirm it.\n\nYou can update your display name on the Profile page at any time.' },
  { slug: 'payment-pending-subscription-not-active', category: 'Billing', title: 'Payment Pending / Subscription Not Active',
    keywords: ['payment', 'paid', 'payment pending', 'subscription', 'billing', 'deducted', 'charge', 'inactive', 'plan', 'upi'],
    body: 'If a payment was deducted but your account still shows payment pending or your plan or subscription is inactive, the payment is usually still being confirmed by your bank.\n\nMost payments, including UPI, activate automatically within 30 minutes. Refresh the Billing page after that time.\n\nIf the plan is still not active after 30 minutes, raise a ticket with the payment date, amount and the UPI or bank reference number so the team can trace it.' },
  { slug: 'refund-status', category: 'Billing', title: 'Refund Status & Reimbursement Timelines',
    keywords: ['refund', 'money back', 'reimbursement', 'cancelled order', 'cancel'],
    body: 'Approved refunds are processed within 5–7 business days and returned to the original payment method.\n\nYou receive an email confirmation once the refund is issued. Your bank may take a few additional days to show it on your statement.' },
  { slug: 'invoice-gst-receipt-download', category: 'Billing', title: 'Invoice & GST Tax Receipt Download Guide',
    keywords: ['invoice', 'download', 'billing', 'receipt', 'pdf', 'tax invoice', 'gst invoice'],
    body: 'Tax invoices and receipts are available under Billing → Invoices as downloadable PDFs.\n\nIf a download fails, try a different browser or allow pop-ups for this site.' },
  { slug: 'dashboard-loading-performance', category: 'Technical', title: 'Dashboard Loading & Performance Troubleshooting',
    keywords: ['dashboard', 'loading', 'technical', 'slow', 'error', 'crash', 'performance', 'blank page'],
    body: 'Clear your browser cache, disable ad-blockers for this site, and confirm you are on a stable internet connection.\n\nMost loading issues are resolved by a hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac).\n\nIf the problem continues, raise a ticket with your browser name and a screenshot of any error message.' },
  { slug: 'iec-registration-modification', category: 'Commerce & Trade', title: 'DGFT Importer-Exporter Code (IEC) Registration & Modification',
    keywords: ['iec', 'importer exporter code', 'export', 'import', 'dgft', 'trade license', 'customs'],
    body: 'To register or modify your Importer-Exporter Code (IEC) with DGFT, link your business PAN, upload a cancelled cheque or bank certificate, and authenticate with Aadhaar or a Digital Signature Certificate (DSC).\n\nIEC modifications are usually approved within 24–48 hours.' },
  { slug: 'gstin-einvoice-eway-bill', category: 'Compliance & GST', title: 'GSTIN Verification, e-Invoice & e-Way Bill Compliance',
    keywords: ['gst', 'gstin', 'e-way bill', 'eway bill', 'einvoice', 'e-invoice', 'tax', 'hsn', 'compliance'],
    body: 'Make sure your GSTIN is active on the GST portal and that the 6-digit HSN codes match your commercial invoice.\n\nFor automated e-Way Bill and e-Invoice generation, verify your GSP API credentials under Trade Compliance settings.' },
  { slug: 'shipment-logistics-tracking', category: 'Logistics & Orders', title: 'Bulk Commerce Shipment & Logistics Hub Tracking',
    keywords: ['shipment', 'logistics', 'tracking', 'dispatch', 'cargo', 'freight', 'delivery', 'bulk order', 'awb'],
    body: 'Commercial cargo and bulk orders update their tracking milestones at every logistics hub scan.\n\nEnter your Consignment or AWB ID in the Logistics portal to download the shipping manifest or check customs clearance status.' },
  { slug: 'support-response-times', category: 'General', title: 'How Support Works & Response Times',
    keywords: ['support', 'response time', 'sla', 'agent', 'human', 'contact', 'ticket'],
    body: 'Every ticket gets a first response from our AI assistant, which answers from these help articles. You can accept its answer or ask for a person at any time.\n\nTarget first-response times: Critical 15 minutes, High 1 hour, Medium 4 hours, Low 24 hours. The ticket page shows the time remaining.' },
];

// Hindi versions (same slug, locale 'hi'). Natural, everyday Hindi; product terms (OTP, UPI, GSTIN…) stay as people say them.
// English keywords are kept too, so a Hindi-locale user who types in English still finds the Hindi article.
const HI = {
  'password-reset': { title: 'पासवर्ड रीसेट करें: पूरी जानकारी और समाधान',
    keywords: ['पासवर्ड', 'पासवर्ड भूल गए', 'रीसेट', 'लॉगिन', 'साइन इन', 'अकाउंट लॉक'],
    body: 'साइन-इन पेज पर "पासवर्ड भूल गए" पर क्लिक करके आप अपना पासवर्ड रीसेट कर सकते हैं। हम आपके रजिस्टर्ड ईमेल पर एक रीसेट लिंक भेजते हैं; उसे खोलकर नया पासवर्ड चुनें।\n\nअगर 5 मिनट में ईमेल न आए, तो स्पैम या प्रमोशन फ़ोल्डर देखें और फिर नया लिंक मँगवाएँ। सिर्फ़ सबसे नया लिंक ही काम करता है।\n\nकई बार ग़लत पासवर्ड डालने से अकाउंट लॉक हो गया हो, तो दोबारा कोशिश करने से पहले 15 मिनट रुकें।' },
  'otp-not-received': { title: 'लॉगिन का वेरिफ़िकेशन कोड (OTP) नहीं आ रहा',
    keywords: ['ओटीपी', 'कोड नहीं आया', 'वेरिफ़िकेशन कोड', 'लॉगिन', 'मैसेज नहीं आया'],
    body: 'वेरिफ़िकेशन कोड (OTP) आने में 2 मिनट तक लग सकते हैं।\n\nध्यान दें कि आप वही फ़ोन नंबर या ईमेल देख रहे हैं जो आपके अकाउंट में रजिस्टर्ड है, और स्पैम फ़ोल्डर भी जाँच लें।\n\n"कोड दोबारा भेजें" दबाने से पहले कुछ मिनट रुकें; लगातार कई कोड मँगवाने से कोड आने में और देर हो सकती है। अपना OTP कभी किसी को न बताएँ, हमारी सपोर्ट टीम को भी नहीं।' },
  'update-email-profile': { title: 'रजिस्टर्ड ईमेल और प्रोफ़ाइल कैसे बदलें',
    keywords: ['ईमेल बदलें', 'ईमेल अपडेट', 'प्रोफ़ाइल', 'नाम बदलें', 'अकाउंट की जानकारी'],
    body: 'Settings → Account में जाकर "ईमेल बदलें" चुनें। हम नए पते पर एक वेरिफ़िकेशन लिंक भेजते हैं; लिंक कन्फ़र्म करते ही बदलाव लागू हो जाता है।\n\nअपना नाम आप कभी भी प्रोफ़ाइल पेज पर बदल सकते हैं।' },
  'payment-pending-subscription-not-active': { title: 'पेमेंट पेंडिंग है / सब्सक्रिप्शन चालू नहीं हुआ',
    keywords: ['पेमेंट', 'भुगतान', 'पैसे कट गए', 'पेमेंट पेंडिंग', 'सब्सक्रिप्शन', 'प्लान', 'यूपीआई'],
    body: 'अगर पैसे कट गए हैं लेकिन अकाउंट में अब भी पेमेंट पेंडिंग दिख रहा है या आपका प्लान/सब्सक्रिप्शन चालू नहीं हुआ है, तो आम तौर पर बैंक की ओर से पेमेंट की पुष्टि अभी बाकी होती है।\n\nUPI समेत ज़्यादातर पेमेंट 30 मिनट के अंदर अपने-आप चालू हो जाते हैं। इतने समय बाद Billing पेज रिफ़्रेश करें।\n\nअगर 30 मिनट बाद भी प्लान चालू न हो, तो पेमेंट की तारीख, रकम और UPI या बैंक रेफ़रेंस नंबर के साथ टिकट बनाएँ, ताकि टीम पेमेंट ढूँढ सके।' },
  'refund-status': { title: 'रिफ़ंड का स्टेटस और पैसे वापस आने का समय',
    keywords: ['रिफ़ंड', 'पैसे वापस', 'वापसी', 'ऑर्डर कैंसल', 'कैंसल'],
    body: 'मंज़ूर हुए रिफ़ंड 5–7 कामकाजी दिनों में प्रोसेस होते हैं और पैसे उसी तरीके में वापस आते हैं जिससे पेमेंट किया गया था।\n\nरिफ़ंड जारी होते ही आपको ईमेल से पुष्टि मिलती है। बैंक स्टेटमेंट में दिखने में कुछ दिन और लग सकते हैं।' },
  'invoice-gst-receipt-download': { title: 'इनवॉइस और GST टैक्स रसीद डाउनलोड करने का तरीका',
    keywords: ['इनवॉइस', 'बिल', 'रसीद', 'डाउनलोड', 'जीएसटी इनवॉइस', 'टैक्स इनवॉइस'],
    body: 'टैक्स इनवॉइस और रसीदें Billing → Invoices में PDF के रूप में डाउनलोड के लिए मौजूद हैं।\n\nअगर डाउनलोड न हो, तो कोई दूसरा ब्राउज़र आज़माएँ या इस साइट के लिए पॉप-अप की अनुमति दें।' },
  'dashboard-loading-performance': { title: 'डैशबोर्ड धीमा है या लोड नहीं हो रहा: समाधान',
    keywords: ['डैशबोर्ड', 'लोड नहीं हो रहा', 'धीमा', 'एरर', 'खाली पेज', 'क्रैश'],
    body: 'ब्राउज़र का कैश साफ़ करें, इस साइट के लिए ऐड-ब्लॉकर बंद करें और देख लें कि इंटरनेट कनेक्शन ठीक चल रहा है।\n\nलोडिंग की ज़्यादातर दिक्कतें हार्ड रिफ़्रेश से ठीक हो जाती हैं (Windows पर Ctrl+Shift+R, Mac पर Cmd+Shift+R)।\n\nअगर फिर भी समस्या बनी रहे, तो अपने ब्राउज़र का नाम और एरर मैसेज के स्क्रीनशॉट के साथ टिकट बनाएँ।' },
  'iec-registration-modification': { title: 'DGFT इम्पोर्टर-एक्सपोर्टर कोड (IEC) रजिस्ट्रेशन और बदलाव',
    keywords: ['आईईसी', 'इम्पोर्ट', 'एक्सपोर्ट', 'निर्यात', 'आयात', 'डीजीएफ़टी', 'कस्टम्स'],
    body: 'DGFT में अपना इम्पोर्टर-एक्सपोर्टर कोड (IEC) रजिस्टर करने या उसमें बदलाव के लिए अपने बिज़नेस का PAN लिंक करें, कैंसल चेक या बैंक सर्टिफ़िकेट अपलोड करें, और आधार या डिजिटल सिग्नेचर सर्टिफ़िकेट (DSC) से वेरिफ़ाई करें।\n\nIEC में बदलाव आम तौर पर 24–48 घंटे में मंज़ूर हो जाते हैं।' },
  'gstin-einvoice-eway-bill': { title: 'GSTIN वेरिफ़िकेशन, ई-इनवॉइस और ई-वे बिल कंप्लायंस',
    keywords: ['जीएसटी', 'जीएसटीआईएन', 'ई-वे बिल', 'ई-इनवॉइस', 'टैक्स', 'एचएसएन', 'कंप्लायंस'],
    body: 'पक्का कर लें कि आपका GSTIN, GST पोर्टल पर एक्टिव है और 6 अंकों वाले HSN कोड आपके कमर्शियल इनवॉइस से मेल खाते हैं।\n\nई-वे बिल और ई-इनवॉइस अपने-आप बनाने के लिए Trade Compliance सेटिंग्स में अपने GSP API क्रेडेंशियल जाँच लें।' },
  'shipment-logistics-tracking': { title: 'बल्क शिपमेंट और लॉजिस्टिक्स हब ट्रैकिंग',
    keywords: ['शिपमेंट', 'ट्रैकिंग', 'डिलीवरी', 'माल', 'कार्गो', 'लॉजिस्टिक्स', 'बल्क ऑर्डर'],
    body: 'कमर्शियल कार्गो और बल्क ऑर्डर की ट्रैकिंग हर लॉजिस्टिक्स हब पर स्कैन होने पर अपडेट होती है।\n\nशिपिंग मैनिफ़ेस्ट डाउनलोड करने या कस्टम्स क्लियरेंस का स्टेटस देखने के लिए Logistics पोर्टल में अपना कंसाइनमेंट या AWB नंबर डालें।' },
  'support-response-times': { title: 'सपोर्ट कैसे काम करता है और जवाब कितनी देर में मिलता है',
    keywords: ['सपोर्ट', 'जवाब का समय', 'एजेंट', 'इंसान से बात', 'संपर्क', 'टिकट'],
    body: 'हर टिकट का पहला जवाब हमारा AI असिस्टेंट देता है, जो इन्हीं हेल्प आर्टिकल्स के आधार पर जवाब देता है। आप उसका जवाब स्वीकार कर सकते हैं या कभी भी किसी व्यक्ति से बात करने को कह सकते हैं।\n\nपहले जवाब का लक्ष्य समय: Critical 15 मिनट, High 1 घंटा, Medium 4 घंटे, Low 24 घंटे। टिकट पेज पर बचा हुआ समय दिखता है।' },
};

export const ARTICLES_HI = ARTICLES.map((a) => ({ slug: a.slug, locale: 'hi', ...HI[a.slug], keywords: [...HI[a.slug].keywords, ...a.keywords] }));

/** Upserts articles by slug and their Hindi translations by (slug, locale). Never touches `views`. Returns the English count. */
export async function upsertArticles() {
  await KbArticle.bulkWrite(ARTICLES.map((a) => ({ updateOne: { filter: { slug: a.slug }, update: { $set: { ...a, locale: 'en' } }, upsert: true } })));
  await KbTranslation.bulkWrite(ARTICLES_HI.map((t) => ({ updateOne: { filter: { slug: t.slug, locale: t.locale }, update: { $set: t }, upsert: true } })));
  return ARTICLES.length;
}
