// 50 unique realistic scenarios per company for SmartCC v4
export const SCENARIOS = {
  sbi: [
    {
      subject: 'ATM cash not dispensed during transaction',
      description: 'An HDFC ATM at South Extension debited Rs 10,000 from my savings account on 22 October, but the machine flashed hardware error and dispensed no cash. Please refund immediately.',
      category: 'accounts', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'atm_cash_not_dispensed',
      reply: 'Your complaint has been registered under reference CRCF-261022-8819. In accordance with RBI guidelines, failed ATM transactions are auto-credited within T+5 days. If delayed beyond this period, compensation of ₹100 per day will be credited to your account automatically.'
    },
    {
      subject: 'Urgent: Block stolen Global International debit card',
      description: 'I lost my SBI debit card ending in 4402 this morning in Connaught Place. Please block it immediately to prevent unauthorized usage and dispatch a replacement card.',
      category: 'cards', priority: 'critical', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'block_lost_debit_card',
      reply: 'Your SBI debit card ending 4402 has been permanently blocked. A replacement EMV chip contactless card has been ordered for delivery to your registered communication address via Speed Post within 5-7 working days.'
    },
    {
      subject: 'UPI transaction timeout on Google Pay (UTR 42918840192)',
      description: 'Transferred Rs 4,500 to grocery merchant via UPI. Account was debited but merchant payment terminal showed transaction failed. Where are the funds?',
      category: 'digital', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.78, intent: 'upi_failed_transaction',
      reply: 'We have tracked UTR 42918840192. The transaction is in pending settlement status with NPCI. If the beneficiary bank does not claim the funds within 24 hours, the amount of ₹4,500 will be reversed to your account.'
    },
    {
      subject: 'Home Loan provisional interest certificate FY 2025-26',
      description: 'Need the provisional interest and principal certificate for my home loan account HL26004417 to submit tax saving proofs to my employer.',
      category: 'loans', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'home_loan_certificate',
      reply: 'You can download your Home Loan Provisional Interest Certificate instantly from OnlineSBI under Enquiries > Home Loan Int. Cert., or directly via the YONO app under Loans > My Borrowings > Tax Certificate.'
    },
    {
      subject: 'Periodic KYC update through YONO app rejected with error 403',
      description: 'Uploaded my newly issued Aadhaar and Form 60 on YONO for re-KYC compliance, but submission failed with error code KYC-403.',
      category: 'kyc', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.72, intent: 'kyc_reverification',
      reply: 'This error occurs when the address on DigiLocker does not match the core banking system. We have initiated manual back-office verification for your submitted documents.'
    },
    {
      subject: 'Urgent cheque book dispatch tracking for current account',
      description: 'Requested a 50-leaf personalized cheque book on 14th Oct for our firm account. Tracking shows dispatched but no tracking number is displayed.',
      category: 'accounts', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.65, intent: 'cheque_book_tracking',
      reply: 'Your cheque book consignment has been dispatched via India Post Speed Post under tracking ID ED994821038IN. Expected delivery is tomorrow.'
    },
    {
      subject: 'Daily IMPS transfer limit and cooling period query',
      description: 'I added a new beneficiary today morning in internet banking. What is the maximum transfer limit allowed during the first 24 hours?',
      category: 'digital', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'beneficiary_cooling_period',
      reply: 'For newly added beneficiaries on OnlineSBI, a cooling period of 4 hours applies after activation. During the first 24 hours, you can transfer a maximum cumulative amount of ₹50,000 via IMPS/NEFT.'
    },
    {
      subject: 'Education loan EMI moratorium extension query',
      description: 'Completed my B.Tech course in July 2026. Requesting a 6-month extension on the repayment moratorium as campus onboarding starts in January.',
      category: 'loans', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.70, intent: 'loan_moratorium',
      reply: 'As per SBI Student Loan scheme, the moratorium period is Course Period + 1 year, or 6 months after securing a job, whichever is earlier. Please submit your offer letter to your loan branch.'
    },
    {
      subject: 'Unauthorized international transaction alert received ($45)',
      description: 'Received SMS alert for an unauthorized international transaction of $45.00 on an unknown merchant while I was asleep. Debit card is with me.',
      category: 'complaints', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.82, intent: 'unauthorized_transaction',
      reply: 'We have instantly blocked international usage and hotlisted your debit card. A cyber fraud dispute CRCF-261023-9901 has been registered with our zero-liability fraud cell.'
    },
    {
      subject: 'Form 15G submission acknowledgement not received',
      description: 'Submitted Form 15G online on 1st October to prevent TDS deduction on senior citizen fixed deposits. How do I verify if it is active?',
      category: 'accounts', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'form_15g_status',
      reply: 'Your Form 15G has been successfully accepted for FY 2025-26 under acknowledgment number 15G-SBI-26-88410. No TDS will be deducted on interest income up to threshold limits.'
    },
    {
      subject: 'YONO SBI login locked due to wrong password attempts',
      description: 'My mother entered incorrect MPIN three times and now the YONO app says access locked for 24 hours. Can this be reset immediately?',
      category: 'digital', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'yono_login_unlock',
      reply: 'You do not need to wait 24 hours. Visit www.onlinesbi.sbi, click on "Forgot Username/Login Password", and reset your profile credentials using your debit card details and OTP.'
    },
    {
      subject: 'Request for duplicate fixed deposit receipt (FD A/C 99042211)',
      description: 'Misplaced physical term deposit advice for our cumulative FD opened in 2024. Need a duplicate copy for bank audit purposes.',
      category: 'accounts', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.89, intent: 'duplicate_fd_receipt',
      reply: 'Physical FD receipts are now available electronically. You can download and print the e-Deposit Advice anytime from OnlineSBI > e-Fixed Deposit > Deposit Advice.'
    },
    {
      subject: 'Car loan prepayment penalty and foreclosure letter request',
      description: 'Want to close our SBI Car Loan CL881920 ahead of tenure. Are there any prepayment penalty charges for individual borrowers?',
      category: 'loans', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'car_loan_foreclosure',
      reply: 'As per RBI guidelines and SBI retail lending policy, there are ZERO prepayment or foreclosure charges for individual floating-rate car loans prepaid from own sources.'
    },
    {
      subject: 'Contactless NFC payment disabled on new SBI RuPay Platinum card',
      description: 'Received new RuPay Platinum card but tap and pay at retail outlets is failing. How to enable contactless transactions?',
      category: 'cards', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'enable_contactless_nfc',
      reply: 'For security, contactless NFC is disabled on newly issued cards. You can enable it via YONO > Service Requests > Manage Debit Card > Manage Usage, or send SMS "SWON NFC <last 4 digits>" to 09223966666.'
    },
    {
      subject: 'Cyber fraud complaint CRCF-261021-9981 status update',
      description: 'Reported unauthorized UPI transaction on national cybercrime portal 1930 three days ago. When will the provisional credit be posted?',
      category: 'complaints', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.80, intent: 'fraud_complaint_status',
      reply: 'The case has been escalated to our Dispute Resolution Team. As per RBI charter, shadow credit will be provided within 10 working days pending final police investigation report.'
    },
    {
      subject: 'NRI account NRE to NRO fund transfer inquiry',
      description: 'I recently returned to India. Can I transfer funds directly from my SBI NRE account to my resident savings account online?',
      category: 'accounts', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.90, intent: 'nre_nro_transfer',
      reply: 'Yes, NRE accounts are fully repatriable. You can transfer funds freely from your NRE account to an NRO account or resident account through OnlineSBI without requiring prior RBI permission.'
    },
    {
      subject: 'Pension slip (PPO) download error for retired railway employee',
      description: 'Trying to generate monthly pension slip from CPPC portal for September 2026 but page returns server timeout.',
      category: 'accounts', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.88, intent: 'pension_slip_download',
      reply: 'SBI Pension Seva portal has been refreshed. Pensioners can also view and download their monthly pension slips directly on the YONO app under Services > Pension Seva.'
    },
    {
      subject: 'Sovereign Gold Bond (SGB) certificate not credited to demat',
      description: 'Applied for SGB tranche via SBI Net Banking on 12 Sep. Issue date was 20 Sep but units are not showing in Zerodha demat.',
      category: 'digital', priority: 'low', status: 'in_progress', tier: 'human', confidence: 0.74, intent: 'sgb_allotment',
      reply: 'RBI takes 10-15 business days to convert physical holding certificates into demat format with CDSL/NSDL. Your DP ID has been forwarded for reconciliation.'
    },
    {
      subject: 'Locker rent auto-debit failure notification received',
      description: 'Received SMS stating annual locker rent of Rs 2,500 could not be recovered due to insufficient balance, but my account has Rs 40,000.',
      category: 'accounts', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'locker_rent_deduction',
      reply: 'The auto-debit mandate was pointing to your secondary savings account ending 1092. We have updated the mandate to debit from your primary operating account.'
    },
    {
      subject: 'Re-issue of expired chip debit card delivery delayed',
      description: 'My SBI Global debit card expired in September. A new card was dispatched on 5th Oct via Speed Post but has not reached my home address yet.',
      category: 'cards', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.68, intent: 'debit_card_dispatch',
      reply: 'We are tracking your consignment with the department of posts. If not delivered by Friday, we will arrange branch pickup at your home branch.'
    },
    {
      subject: 'Beneficiary addition cooling period in SBI internet banking',
      description: 'Added my brother as an inter-bank NEFT beneficiary at 10 AM. Why is the beneficiary showing in approval pending status?',
      category: 'digital', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'beneficiary_cooling_period',
      reply: 'Beneficiaries added via OnlineSBI are activated within 4 hours if approved via high security OTP. Transfers up to ₹50,000 can be executed immediately upon activation.'
    },
    {
      subject: 'Mudra loan application status for kirana store expansion',
      description: 'Submitted Shishu Mudra loan application for Rs 50,000 along with Udyam registration at Rohini branch 2 weeks ago.',
      category: 'loans', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.73, intent: 'mudra_loan_status',
      reply: 'Your Mudra application file REF-MUD-9912 has been reviewed by the branch field officer. Sanction letter will be dispatched for execution this week.'
    },
    {
      subject: 'Standing instruction for mutual fund SIP failed on 15th',
      description: 'SBI Mutual Fund SIP of Rs 5,000 bounced due to SI failure, even though balance was maintained. Will I be charged bounce penalty?',
      category: 'digital', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'si_failure_charges',
      reply: 'The failure was caused by an NPCI mandate processing glitch on 15th. Any ECS/NACH bounce fees levied will be automatically reversed in the next billing cycle.'
    },
    {
      subject: 'Change of home branch transfer via OnlineSBI',
      description: 'Relocated from Bengaluru to Pune. Submitted online branch transfer request to Pune Camp branch 4 days ago. What is the status?',
      category: 'accounts', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'branch_transfer_status',
      reply: 'Your account has been successfully transferred to Pune Camp Branch (IFS Code: SBIN0000454). Your existing account number, cheque book, and debit card remain active.'
    },
    {
      subject: 'ATM card swallowed by machine at Connaught Place branch',
      description: 'Card was retained by machine when power flickered during withdrawal. Branch guard told me to contact customer care.',
      category: 'cards', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'card_captured_atm',
      reply: 'For security reasons, cards captured by ATM machines are destroyed by the custodian. We have marked the card as destroyed and issued a free replacement.'
    },
    {
      subject: 'Pre-approved personal loan offer verification',
      description: 'Received SMS from SBI offering pre-approved personal loan of Rs 3,00,000 on YONO with zero processing fee. Is this genuine?',
      category: 'loans', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'preapproved_loan_check',
      reply: 'Yes, this is a genuine Real-Time Xpress Credit (RTXC) pre-approved offer. You can verify and avail instant disbursement into your savings account directly through the YONO app.'
    },
    {
      subject: 'Aadhaar seeding with bank account for DBT subsidy status',
      description: 'Submitted Aadhaar consent form for receiving PM-KISAN subsidy in my SBI account. NPCI mapping is not reflecting on UIDAI portal.',
      category: 'kyc', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'aadhaar_dbt_seeding',
      reply: 'Your Aadhaar is successfully seeded with SBI account ending 7712 and marked as the active DBT mandate with NPCI mapper as of 18 October.'
    },
    {
      subject: 'Unrecognized debit of annual SMS alert charges',
      description: 'Rs 17.70 was debited from my zero balance BSBD account for SMS charges. Aren’t SMS charges free for BSBD accounts?',
      category: 'complaints', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'sms_charges_reversal',
      reply: 'As per RBI circular, Basic Savings Bank Deposit (BSBD) accounts are exempt from SMS alert fees. The system charge of ₹17.70 has been automatically refunded to your ledger balance.'
    },
    {
      subject: 'POS swipe machine error code 05 at retail store',
      description: 'My card was declined with Error 05 (Do Not Honour) while purchasing medicine worth Rs 3,200. Account has sufficient funds.',
      category: 'cards', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.76, intent: 'pos_transaction_declined',
      reply: 'Error 05 was triggered by our automated fraud risk rule due to multiple card swipes in quick succession. The security hold on the merchant category has now been cleared.'
    },
    {
      subject: 'Stop payment on issued cheque #440192 due to lost document',
      description: 'Issued cheque of Rs 25,000 to contractor, but the envelope was lost in transit. Please place stop payment instruction immediately.',
      category: 'accounts', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'stop_cheque_payment',
      reply: 'Stop payment has been successfully placed on Cheque No. 440192. Any clearing presentation for this instrument will be returned with reason "Payment Stopped by Drawer".'
    },
    {
      subject: 'FASTag recharge money deducted but balance not credited',
      description: 'Recharged SBI FASTag with Rs 1,000 via UPI. Bank SMS confirms debit but FASTag portal wallet shows old balance.',
      category: 'digital', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.77, intent: 'fastag_recharge_issue',
      reply: 'National Electronic Toll Collection (NETC) gateway reconciliation is in progress. The balance of ₹1,000 will reflect on your tag wallet within 2 hours.'
    },
    {
      subject: 'Senior Citizen Savings Scheme (SCSS) quarterly interest inquiry',
      description: 'What is the current annual interest rate on SCSS account for Q3 2026 and on what dates is interest disbursed?',
      category: 'accounts', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'scss_interest_dates',
      reply: 'The current interest rate for SCSS is 8.2% per annum. Interest is payable quarterly on the first working day of April, July, October, and January directly into your linked SBI savings account.'
    },
    {
      subject: 'Gold loan locker inspection and valuation certificate',
      description: 'Applied for agricultural gold loan at Alwar branch. When will the approved appraiser inspect the ornaments?',
      category: 'loans', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.70, intent: 'gold_loan_process',
      reply: 'Branch gold appraiser visits on Tuesdays and Thursdays between 11:00 AM and 3:00 PM. Please carry your ornaments along with purchase invoice if available.'
    },
    {
      subject: 'Reversal of failed NEFT transfer to ICICI bank account',
      description: 'NEFT of Rs 18,000 initiated on Saturday was returned by beneficiary bank due to account closed. When will money return?',
      category: 'digital', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'neft_return_reversal',
      reply: 'Returned NEFT transactions are credited back to the originator account in the next batch clearance cycle. The amount of ₹18,000 has been credited back to your account.'
    },
    {
      subject: 'Merchant chargeback request for double charge at supermarket',
      description: 'Billed twice for grocery purchase of Rs 1,420 on 18 Oct. Both debits appear on my bank statement with different RRNs.',
      category: 'complaints', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.84, intent: 'pos_duplicate_charge',
      reply: 'Chargeback claim CB-261022-441 has been registered with Visa/Mastercard network. Provisional reversal will be posted to your account within 7 working days.'
    },
    {
      subject: 'RuPay Select debit card airport lounge access query',
      description: 'Does my SBI Platinum RuPay debit card provide complimentary lounge access at Delhi IGI Airport Terminal 3 domestic departures?',
      category: 'cards', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'lounge_access_eligibility',
      reply: 'Yes, SBI RuPay Platinum debit cards offer 2 complimentary domestic airport lounge access visits per calendar quarter. Swipe your card at the lounge reception with a nominal ₹2 validation charge.'
    },
    {
      subject: 'Overdraft facility against Fixed Deposit (e-STDR OD)',
      description: 'Can I avail an overdraft limit against my multi-option deposit of Rs 5,00,000 online without visiting the branch?',
      category: 'loans', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'od_against_fd',
      reply: 'Yes, you can avail Overdraft against FD (up to 90% of deposit value) instantly via OnlineSBI > e-Fixed Deposit > Overdraft against Fixed Deposit with zero processing fees.'
    },
    {
      subject: 'Address update with electricity bill in SBI records',
      description: 'Can I upload a utility electricity bill for changing address on savings account, or is passport mandatory?',
      category: 'kyc', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'address_update_documents',
      reply: 'Utility bills not older than 2 months are accepted as Officially Valid Documents (OVD) for address updates under RBI Master Direction on KYC.'
    },
    {
      subject: 'ATM daily cash withdrawal limit enhancement request',
      description: 'Need to withdraw Rs 60,000 cash for hospital admission fees tomorrow. Current card limit is Rs 40,000.',
      category: 'cards', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.79, intent: 'atm_limit_enhancement',
      reply: 'Classic/Global cards have a daily cap of ₹40,000. You can increase your daily limit up to ₹1,00,000 by upgrading to an SBI Pride or Platinum debit card in YONO, or visit the branch for cash counter withdrawal.'
    },
    {
      subject: 'Form DA-1 submission for adding spouse as nominee',
      description: 'Want to register my wife as 100% nominee in my savings account. Can this be submitted via internet banking?',
      category: 'accounts', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'nominee_addition_online',
      reply: 'Yes, you can add or modify nomination online via OnlineSBI under Request & Enquiries > Nomination, or via YONO > Service Requests > Manage Nominee.'
    },
    {
      subject: 'PPF account annual interest credit confirmation',
      description: 'When does SBI calculate and credit the annual interest on Public Provident Fund (PPF) accounts for FY 2025-26?',
      category: 'accounts', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'ppf_interest_credit',
      reply: 'PPF interest is calculated monthly on the minimum balance between the 5th and the last day of each month, and credited to the account annually on 31st March.'
    },
    {
      subject: 'Debit card green PIN generation failure via SMS',
      description: 'Sent SMS "PIN 4402 8821" to 567676 from registered mobile but received no OTP on phone.',
      category: 'cards', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'green_pin_generation',
      reply: 'Green PIN OTP can also be generated directly at any SBI ATM (select PIN Generation) or by calling our toll-free IVR at 1800 1234.'
    },
    {
      subject: 'Dormant account reactivation procedure',
      description: 'My savings account ending 0918 has not had any transactions for 2 years and is marked inoperative. How to reactivate?',
      category: 'accounts', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'dormant_account_reactivation',
      reply: 'As per RBI norms, reactivation requires submitting a fresh KYC form along with PAN and Aadhaar copy at any SBI branch. No charges are levied for activating inoperative accounts.'
    },
    {
      subject: 'YONO Cash cardless withdrawal timeout issue at ATM',
      description: 'Generated YONO cash transaction reference of Rs 2,000. ATM dispensed no cash but reference is showing used.',
      category: 'digital', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'yono_cash_timeout',
      reply: 'If cash is not collected within the 4-hour validity window, the transaction expires and money is immediately unblocked in your savings balance.'
    },
    {
      subject: 'Phishing SMS warning: Link clicked accidentally',
      description: 'Received SMS stating "SBI Rewards expire today, redeem at bit.ly/sbi-rw". I clicked link and entered net banking username before realizing.',
      category: 'complaints', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.91, intent: 'phishing_alert',
      reply: 'We have instantly locked your internet banking credentials and disabled all digital banking channels to safeguard your funds. Please reset your password from a secure device.'
    },
    {
      subject: 'Credit card reward points redemption failure',
      description: 'SBI Card reward points catalog shows checkout error when trying to redeem 12,000 points for Amazon gift voucher.',
      category: 'cards', priority: 'low', status: 'in_progress', tier: 'human', confidence: 0.69, intent: 'reward_points_redemption',
      reply: 'SBI Card reward catalog maintenance is underway until 6:00 PM today. Please retry after maintenance window completes.'
    },
    {
      subject: 'Salary account upgrade to SBI Corporate Salary Package (CSP)',
      description: 'Joined new multinational firm in Gurugram. What documents are needed to convert existing savings account to Platinum CSP?',
      category: 'accounts', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'csp_account_upgrade',
      reply: 'Submit an application letter along with your official employee ID card and latest salary slip to convert your account to CSP with free unlimited ATM withdrawals and zero minimum balance.'
    },
    {
      subject: 'Central Sector Interest Subsidy (CSIS) on education loan',
      description: 'How to claim interest subsidy for undergraduate education loan for economically weaker section (EWS)?',
      category: 'loans', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.75, intent: 'csis_subsidy_claim',
      reply: 'Please submit your state income certificate (< ₹4.5 lakh/annum) to your loan branch to enable annual interest subsidy claims through Canara Bank nodal portal.'
    },
    {
      subject: 'Virtual debit card issuance for international e-commerce',
      description: 'Can I generate an instant virtual debit card on YONO without waiting for plastic card to arrive?',
      category: 'cards', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'virtual_card_creation',
      reply: 'Yes, navigate to YONO > Cards > My Debit Cards > Generate Virtual Card. Your virtual card is activated instantly for secure domestic and international e-commerce.'
    },
    {
      subject: 'Demand draft cancellation and fund refund procedure',
      description: 'Purchased a DD for Rs 75,000 in favour of university for admission. Admission was cancelled; how do I deposit DD back?',
      category: 'accounts', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'dd_cancellation_refund',
      reply: 'Submit the original physical DD along with a cancellation request letter at the issuing branch. The amount will be credited back to your account minus a nominal cancellation fee of ₹150.'
    }
  ],

  tatasteel: [
    {
      subject: 'Test Certificate (MTC) download for TMT Rebar Fe 550D batch',
      description: 'We require the Mill Test Certificate (MTC) for consignment TS-2026-904 delivered to our Ranchi stockyard yesterday. Need physical inspection sign-off.',
      category: 'specifications', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'mtc_download',
      reply: 'Your Mill Test Certificate for Heat No. H-2610-884 is ready. You can download the digitally signed MTC directly from the Tata Steel Aashiyana/Distributor portal under Orders > Invoices & Documents.'
    },
    {
      subject: 'Delayed dispatch of HR Coil order TS-2026-904 from Jamshedpur',
      description: 'Delivery of 60 MT Hot Rolled coils for our pipe manufacturing unit was scheduled for 20th October. The truck has not arrived at our Adityapur plant.',
      category: 'orders', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.79, intent: 'order_dispatch_delay',
      reply: 'The consignment has been loaded on transporter truck JH-05-CD-4190 and cleared plant Gate #3 this morning. Real-time GPS tracking link has been sent to your registered logistics coordinator.'
    },
    {
      subject: 'GST e-invoice IRN mismatch on invoice SFS/26-27/097',
      description: 'Our accounting ERP cannot validate the Invoice Reference Number (IRN) generated on tax invoice SFS/26-27/097. The GST portal rejects the QR code.',
      category: 'billing', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'e_invoice_mismatch',
      reply: 'The IRN mismatch was caused by an amendment in billing address pincode. We have cancelled the invalid IRN and generated revised e-invoice with valid NIC hash. Digitally signed copy is attached.'
    },
    {
      subject: 'Tare weight discrepancy at weighbridge gate #4',
      description: 'Consignee trailer truck gross weight recorded 42.4 MT at plant exit, but receiver weighbridge recorded 41.2 MT (1.2 MT difference). We request recalibration check.',
      category: 'logistics', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.75, intent: 'weight_discrepancy',
      reply: 'We have logged weight discrepancy claim WT-2610-109. Both weighbridge calibration certificates have been pulled for review by our quality surveyor.'
    },
    {
      subject: 'Tiscon Superlinks distributor bulk price slab discount',
      description: 'We are ordering 250 MT of Tiscon Superlinks for Q3. What is the applicable tier-1 volume discount for eastern zone distributors?',
      category: 'dealers', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'distributor_discount_slab',
      reply: 'For orders exceeding 200 MT per quarter, Tier-1 distributors receive a rebate of ₹1,200 per MT, adjusted via commercial credit note at monthly billing closure.'
    },
    {
      subject: 'Dispatch schedule for Kaveri Infra Kochi highway project',
      description: 'Confirming delivery milestone of 180 MT epoxy coated TMT rebars for pier foundation work starting Monday morning in Ernakulam.',
      category: 'logistics', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.76, intent: 'project_dispatch_schedule',
      reply: 'Two dedicated flatbed trailers carrying 90 MT each are currently in transit near Coimbatore bypass. Estimated arrival at Kochi project site is Sunday 6:00 PM.'
    },
    {
      subject: 'Mill test report chemistry analysis for structural angle batch',
      description: 'Client third-party audit requires carbon equivalent (CE) calculation report for structural angles 100x100x10 supplied under PO-8841.',
      category: 'specifications', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'chemical_analysis_report',
      reply: 'The carbon equivalent (CE) value for heat batch 44810 is 0.38%, well within the IS 2062 E250 standard ceiling limit of 0.42%.'
    },
    {
      subject: 'Scrap metal e-auction vendor portal registration failure',
      description: 'Trying to register our foundry firm on Tata Steel e-auction portal for melting scrap bidding, but digital signature certificate (DSC) validation fails.',
      category: 'dealers', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'auction_portal_dsc',
      reply: 'Our auction portal supports Class 3 SHA-256 DSC tokens. Please run the Java Web Start utility in Chrome and whitelist https://procurement.tatasteel.com.'
    },
    {
      subject: 'Transit damage claim for rusted cold rolled sheets in rain',
      description: 'Tarpaulin tore during transit from Jamshedpur to Raipur. Entire top layer of CR coil batch has surface rust and water staining.',
      category: 'claims', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'transit_damage_claim',
      reply: 'Claim registered under TC-2610-092. Please retain the damaged packaging intact for joint inspection by our transit insurance surveyor tomorrow at 11 AM.'
    },
    {
      subject: 'Contractor worker safety induction gate pass renewal',
      description: 'Annual safety passport expired for 14 fabrication technicians working at Cold Rolling Mill (CRM) expansion project. Requesting slot for refresher batch.',
      category: 'specifications', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'safety_induction_pass',
      reply: 'Slots for contractor safety induction and medical fitness test have been booked for your 14 workers at Jamshedpur Safety Centre for tomorrow at 8:30 AM.'
    },
    {
      subject: 'Overdue payment confirmation for machining spares PO-88192',
      description: 'Submitted tax invoice for hydraulic cylinder repair 45 days ago. Outstanding payment of Rs 3,40,000 has not been credited.',
      category: 'billing', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'vendor_payment_status',
      reply: 'Payment of ₹3,40,000 has been approved by maintenance finance and processed via NEFT under UTR TATA2610239910. Funds will reflect in your account by evening.'
    },
    {
      subject: 'Hot rolled plate thickness tolerance variance dispute',
      description: 'Ordered 25mm structural plates under batch TS-PL-209. Micrometer inspection shows 23.8mm (-1.2mm deviation), exceeding tolerance.',
      category: 'claims', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.77, intent: 'thickness_tolerance_claim',
      reply: 'As per IS 1852 tolerance standards for 25mm plates, the permissible thickness variation is ±0.8mm. Our technical quality engineer has been assigned to visit your yard.'
    },
    {
      subject: 'Dealer portal credit limit enhancement request for festive season',
      description: 'Requesting temporary credit limit enhancement from Rs 2.5 Crore to Rs 3.5 Crore for festive construction peak demand.',
      category: 'dealers', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.73, intent: 'credit_limit_increase',
      reply: 'Your request along with past 12-month payment track record has been forwarded to Regional Credit Committee. Letter of Guarantee format has been emailed.'
    },
    {
      subject: 'Net Zero Green Steel environmental compliance certificate',
      description: 'Need Environmental Product Declaration (EPD) and green steel carbon footprint certificate for LEED certification of commercial tower in Hyderabad.',
      category: 'specifications', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'green_steel_epd',
      reply: 'Tata Steel Tiscon holds GreenPro and EPD certifications. The verified cradle-to-gate carbon intensity certificate for your consignment is available for download.'
    },
    {
      subject: 'High tensile wire rod WR-10 delivery timeline for auto fasteners',
      description: 'Our fastener manufacturing schedule requires 40 MT of boron-treated wire rod WR-10 by 28th October to prevent factory assembly shutdown.',
      category: 'orders', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.78, intent: 'auto_wire_rod_schedule',
      reply: 'Billet heating and wire drawing for your batch is scheduled at New Wire Rod Mill today. Rolling completion and dispatch is confirmed for Friday.'
    },
    {
      subject: 'Rail rake allotment update at Jamshedpur plant siding',
      description: 'Status of BCNHL railway rake allocation for moving 2,400 MT steel billets to Visakhapatnam port for export vessel loading.',
      category: 'logistics', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.72, intent: 'rail_rake_allotment',
      reply: 'South Eastern Railway has assigned rake IND-RAKE-9901 with placement expected at plant siding by 4:00 AM tomorrow. Loading operations will complete in 12 hours.'
    },
    {
      subject: 'Advance deposit refund for cancelled wire coil consignment',
      description: 'Cancelled PO-9940 for 20 MT wire coils due to customer engineering change. Advance deposit of Rs 4,80,000 pending refund.',
      category: 'billing', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'advance_deposit_refund',
      reply: 'The cancellation has been accepted with zero cancellation penalty. Refund of ₹4,80,000 has been credited to your bank account via RTGS.'
    },
    {
      subject: 'Annual volume rebate credit note calculation discrepancy',
      description: 'Credit note CN-26-8801 reflects rebate on 1,420 MT instead of our audited annual dispatch of 1,510 MT. Difference of 90 MT.',
      category: 'dealers', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.76, intent: 'rebate_discrepancy',
      reply: 'The missing 90 MT consignment was billed in the last week of March and invoiced under temporary depot code. Supplementary credit note of ₹1,08,000 is being issued.'
    },
    {
      subject: 'Wire rod bundle strapping broke during crane unloading',
      description: 'Steel strapping bands on 4 wire rod bundles sheared during gantry unloading at dealer warehouse, causing loose coils.',
      category: 'claims', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'strapping_damage',
      reply: 'Consignment packaging standards have been noted. A strapping crew from our nearby service center will re-bundle the coils at your site today.'
    },
    {
      subject: 'Galvanized corrugated sheet stock availability in Ranchi depot',
      description: 'Urgent requirement for 500 bundles of 0.40mm GC roofing sheets for rural disaster reconstruction project in Jharkhand.',
      category: 'orders', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'stock_availability_query',
      reply: 'Ranchi central depot currently holds 720 bundles of 0.40mm Tata Shaktee GC sheets in stock ready for immediate delivery.'
    },
    {
      subject: 'Vendor invoice rejection due to purchase order quantity mismatch',
      description: 'Supplied 120 units of industrial safety valves under PO-55109. Invoice rejected in SAP portal saying PO was for 100 units.',
      category: 'billing', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.74, intent: 'po_quantity_mismatch',
      reply: 'The additional 20 units were delivered against emergency verbal instruction from plant engineers. PO amendment for 120 units has been processed in SAP.'
    },
    {
      subject: 'Technical datasheet for Tata Astrum HR plates',
      description: 'Need yield strength, elongation, and weldability parameters for Tata Astrum HR plates grade S355 for pressure vessel design.',
      category: 'specifications', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'technical_datasheet',
      reply: 'Comprehensive technical datasheet for Tata Astrum S355 is attached, detailing minimum yield strength of 355 MPa and impact toughness at -20°C.'
    },
    {
      subject: 'Special length custom cut rebar delivery request',
      description: 'Requirement for 14-meter non-standard lengths of 32mm TMT rebars for metro viaduct span construction in Kolkata.',
      category: 'orders', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.75, intent: 'custom_length_rebars',
      reply: 'Custom cut lengths of 14m can be bundled directly at our Bar Mill with a minimum order quantity of 50 MT. Delivery lead time is 10 days.'
    },
    {
      subject: 'Driver e-way bill validity expired due to highway breakdown',
      description: 'Trailer carrying 35 MT steel billets broke down near Kharagpur. E-way bill expires tonight at midnight. Please extend validity.',
      category: 'logistics', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'eway_bill_extension',
      reply: 'E-way bill validity has been extended by 24 hours on the GST portal under vehicle breakdown clause. Updated e-way bill PDF has been sent to driver.'
    },
    {
      subject: 'Credit period extension request for quarterly order settlement',
      description: 'Requesting 15-day grace period on bill TS-INV-4412 due to temporary payment delay from government infrastructure contractor.',
      category: 'dealers', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.70, intent: 'credit_period_extension',
      reply: 'Grace extension of 10 business days has been approved by the Credit Management Team without penal interest charges.'
    },
    {
      subject: 'Grade Fe 500 vs Fe 550D yield strength comparison inquiry',
      description: 'Structural consultant is recommending changing specifications from Fe 500 to Fe 550D for high-rise tower in seismic zone IV.',
      category: 'specifications', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'rebar_grade_comparison',
      reply: 'Tiscon 550D has minimum 550 MPa yield strength with minimum 16% elongation and 1.10 ultimate tensile to yield ratio, providing superior ductility for seismic zones.'
    },
    {
      subject: 'Duplicate debit note issued for demurrage charges',
      description: 'Billed twice for railway rake unloading demurrage of Rs 45,000 for siding rake placed on 12 October.',
      category: 'billing', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'demurrage_duplicate_billing',
      reply: 'Demurrage record reconciliation showed double billing by plant logistics. Credit note CN-DEM-2601 of ₹45,000 has been issued to clear the excess charge.'
    },
    {
      subject: 'Primary dealership application for eastern Uttar Pradesh',
      description: 'Our trading firm in Varanasi with 20,000 sq ft warehousing wants to apply for authorized Tiscon primary dealership.',
      category: 'dealers', priority: 'low', status: 'in_progress', tier: 'human', confidence: 0.68, intent: 'dealership_application',
      reply: 'Dealership applications for Varanasi territory are currently under review. Our Regional Sales Manager will contact you for site verification.'
    },
    {
      subject: 'Transporter freight bill clearance for September dispatches',
      description: 'Freight invoices totaling Rs 12,40,000 for 42 truck trips from Jamshedpur to Odisha verified but payment not released.',
      category: 'billing', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'transporter_freight_payment',
      reply: 'All proof of deliveries (POD) have been certified by destination depot managers. The payment batch has been cleared for payment processing tomorrow.'
    },
    {
      subject: 'Color coated sheets warranty certificate request',
      description: 'Client requires formal 15-year anti-perforation corrosion warranty certificate for Tata Colorbond roofing installed on factory building.',
      category: 'claims', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'warranty_certificate',
      reply: 'Colorbond 15-year performance warranty certificate has been generated under Project ID CB-2610-994 and issued in the name of the project owner.'
    },
    {
      subject: 'Rebar consignment missing one bundle upon arrival',
      description: 'Delivery invoice specifies 24 bundles of 16mm rebars, but physical tally at site reveals only 23 bundles. Consignment delivery challan signed with remark.',
      category: 'claims', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.82, intent: 'short_delivery_claim',
      reply: 'Discrepancy noted on lorry receipt. Short-supply claim SC-2610-44 has been approved. Replacement bundle will be delivered from nearby Hub tomorrow.'
    },
    {
      subject: 'Jamshedpur central warehouse gate entry pass delay',
      description: 'Vendor trucks waiting outside Gate #5 for more than 6 hours for physical gate pass issuance and material inward clearance.',
      category: 'logistics', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.90, intent: 'gate_pass_delay',
      reply: 'Gate entry system encountered brief network downtime. Manual gate passes have been authorized and all waiting vehicles are being admitted on priority.'
    },
    {
      subject: 'Customized pre-engineered building (PEB) section RFQ',
      description: 'Requesting commercial quote for 450 MT fabricated built-up beams and cold-formed Z purlins for industrial warehouse project in Sanand.',
      category: 'orders', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.74, intent: 'peb_commercial_quote',
      reply: 'Your structural drawings have been sent to our PEB engineering estimating team. Formal techno-commercial proposal will be submitted by Thursday.'
    },
    {
      subject: 'TDS certificate Form 16A download from vendor portal',
      description: 'Unable to locate Q2 TDS certificate on supplier accounting portal for tax filing reconciliation.',
      category: 'billing', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'tds_certificate_download',
      reply: 'Quarterly Form 16A certificates have been uploaded under TRACES repository. You can download the signed certificate from Accounts > Tax Documents.'
    },
    {
      subject: 'Tata Shaktee roofing sheets distributor price revision circular',
      description: 'Requesting official monthly price circular for galvanized corrugated sheets effective 1st November for dealer quotation.',
      category: 'dealers', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'price_circular_request',
      reply: 'Monthly distributor price circular No. TSL/R/26-11 has been published on the partner portal. Price remains unchanged across all standard gauges.'
    },
    {
      subject: 'Tensile test failure report on structural tube sample',
      description: 'Third-party NABL lab reported yield strength of 290 MPa on rectangular hollow section against specified 310 MPa. Factory work stopped.',
      category: 'claims', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.83, intent: 'material_test_failure',
      reply: 'Quality investigation QC-2610-88 initiated. Our metallurgy team is dispatching a duplicate verified specimen from the same master coil for re-testing.'
    },
    {
      subject: 'Material delivery to restricted industrial zone clearance',
      description: 'Truck carrying steel columns denied entry at Dahej SEZ due to missing customs transit documentation.',
      category: 'logistics', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'sez_entry_clearance',
      reply: 'Customs endorsement Bill of Export copy has been emailed to the SEZ gate customs officer. The truck has been cleared for entry.'
    },
    {
      subject: 'E-invoice QR code scanning error in customer ERP',
      description: 'B2B QR code on invoice TS-INV-8891 returns invalid payload checksum in SAP S/4HANA invoice verification module.',
      category: 'billing', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'qr_code_error',
      reply: 'The QR code was regenerated using the updated 2026 NIC specification. Updated PDF invoice with verified high-density barcode is available.'
    },
    {
      subject: 'Export consignment ocean bill of lading tracking',
      description: 'Shipping documents for 1,200 MT wire rod export to Dubai via Kolkata port not received by negotiating bank.',
      category: 'logistics', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.77, intent: 'export_bl_tracking',
      reply: 'Bill of Lading has been released by Maersk Line. Physical document courier DHL-994012 is scheduled for bank delivery by tomorrow morning.'
    },
    {
      subject: 'Tiscon Readybuild cut and bend rebar delivery schedule',
      description: 'Need delivery confirmation for scheduled batch of 35 MT machine-bent stirrups and crank bars for foundation pouring in Bangalore.',
      category: 'orders', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.76, intent: 'readybuild_delivery_status',
      reply: 'Bending schedule BS-2610-04 has completed fabrication at Bangalore Readybuild Center. Loading on trailer is scheduled for early morning delivery.'
    },
    {
      subject: 'Zinc coating thickness (GSM) certificate for GP coils',
      description: 'Auditor requires verified test certificate confirming 120 GSM zinc mass coating on galvanized plain steel coils supplied under batch GP-4401.',
      category: 'specifications', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'zinc_coating_gsm',
      reply: 'Test certificate confirms average zinc coating of 132 GSM across triple spot tests, well exceeding the specified 120 GSM commercial standard.'
    },
    {
      subject: 'Scrap disposal payment receipt verification',
      description: 'Transferred Rs 8,50,000 for auction lot SL-99 via RTGS yesterday. Gate pass is not unlocking on the disposal yard system.',
      category: 'billing', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'scrap_payment_gatepass',
      reply: 'RTGS remittance has been reconciled with State Bank of India. Delivery Order (DO) has been generated and vehicle entry pass is now unlocked.'
    },
    {
      subject: 'Emergency delivery of wire rods for power transmission tower',
      description: 'Cyclone damaged transmission line tower in coastal Odisha requires urgent 25 MT high-tensile wire rods for immediate restoration.',
      category: 'orders', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.85, intent: 'emergency_supply_priority',
      reply: 'Order flagged under Emergency Power Restoration Protocol. Material is being dispatched on green corridor transit from Jamshedpur plant today.'
    },
    {
      subject: 'Pallet packaging improvement suggestion for export sheets',
      description: 'Recommend adding desiccants inside moisture barrier wrapping for ocean shipments during monsoon humidity.',
      category: 'logistics', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'packaging_feedback',
      reply: 'Thank you for your valuable feedback. Our packaging technical team has approved the inclusion of silica gel desiccant packs for all monsoon sea freight consignments.'
    },
    {
      subject: 'Sub-dealer retail loyalty rewards points redemption',
      description: 'Retail counter has accumulated 48,000 Tiscon Mitr reward points. Catalog gift voucher checkout is failing with OTP error.',
      category: 'dealers', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'loyalty_points_redemption',
      reply: 'Your registered mobile number has been synchronized with the Tiscon Mitr loyalty engine. Gift voucher redemption is now active.'
    },
    {
      subject: 'Short supply claim on billet shipment',
      description: 'Physical count of 150mm square billets in wagon rake reveals 3 billets less than railway receipt weight. Shortage of 4.5 MT.',
      category: 'claims', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.79, intent: 'billet_shortage_claim',
      reply: 'Joint inspection report signed with station commercial superintendent has been uploaded. Commercial credit note will be issued upon claim certification.'
    },
    {
      subject: 'Certificate of origin request for Middle East export',
      description: 'Need Chamber of Commerce attested Certificate of Origin for customs clearance of steel pipes arriving at Jebel Ali port.',
      category: 'specifications', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'certificate_of_origin',
      reply: 'Attested Certificate of Origin issued by Indian Chamber of Commerce under reference ICC-EXP-26-880 has been dispatched via international courier.'
    },
    {
      subject: 'In-plant weighing calibration certificate request',
      description: 'Client ISO 9001 quality audit requires annual stamping certificate for weighbridge WB-04 at Jamshedpur Works.',
      category: 'logistics', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'weighbridge_calibration_cert',
      reply: 'Government Legal Metrology department calibration and stamping certificate valid through March 2027 is attached.'
    },
    {
      subject: 'Credit note adjustment against pending invoices',
      description: 'Requesting adjustment of approved damage credit note CN-8810 worth Rs 85,000 against upcoming invoice TS-INV-9904.',
      category: 'billing', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'credit_note_adjustment',
      reply: 'Credit note CN-8810 has been mapped against invoice TS-INV-9904 in the customer ledger. The net payable balance has been updated.'
    },
    {
      subject: 'Corrosion inhibitor coating query for marine environment',
      description: 'Is Tiscon Readybuild available with polymer anti-corrosion coating for coastal jetty pile construction in Paradip?',
      category: 'specifications', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'marine_coating_specs',
      reply: 'Yes, Tata Steel supplies Fusion Bonded Epoxy (FBE) coated rebars conforming to ASTM A775 specifications specifically designed for marine exposure environments.'
    }
  ],

  delhiairport: [
    {
      subject: 'Left Louis Vuitton handbag near T3 Gate 28 (Lost & Found)',
      description: 'Departed on flight AI-144 to London this afternoon and accidentally left my brown leather handbag near boarding Gate 28. Contains prescription glasses and room key.',
      category: 'baggage', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'lost_item_inquiry',
      reply: 'Our CISF security patrol has deposited a brown handbag matching your description with the 24x7 Lost & Found Center at Terminal 3 Arrivals. Reference ID: LF-DEL-2610-884.'
    },
    {
      subject: 'DigiYatra biometric gate facial recognition failure at Gate 2',
      description: 'Encountered repeated validation failed errors on the DigiYatra e-gate scanner at T3 Departure Gate 2. Had to queue in regular manual line.',
      category: 'security', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'digiyatra_error',
      reply: 'DigiYatra e-gates require your face biometric and boarding pass PNR to match your Aadhaar credentials. The scanner camera at Gate 2 has been recalibrated by our technical team.'
    },
    {
      subject: 'Terminal 1 to Terminal 3 inter-terminal complimentary bus timings',
      description: 'Arriving at T1 domestic on SpiceJet and connecting to international flight on Emirates at T3. What is the frequency of the transfer bus and where is the pickup?',
      category: 'terminals', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'terminal_transfer_shuttle',
      reply: 'Complimentary shuttle buses operate every 20 minutes between T1, T2, and T3. Present your connecting boarding pass at the inter-terminal transfer counter located outside T1 arrivals.'
    },
    {
      subject: 'FASTag double deduction at Multi-Level Car Parking (MLCP)',
      description: 'Parked my vehicle DL-01-AB-1234 for 3 hours at T3 MLCP. FASTag account was charged Rs 180 twice at the exit boom barrier.',
      category: 'parking', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'parking_fastag_double_charge',
      reply: 'We have verified the parking barrier transaction log with NPCI. The duplicate deduction of ₹180 has been initiated for refund back to your FASTag wallet within 3 business days.'
    },
    {
      subject: 'Wheelchair assistance confirmation for elderly passenger',
      description: 'Booked wheelchair for my 78-year-old grandmother travelling on flight 6E-201 tomorrow morning. Where will the wheelchair assistant meet us?',
      category: 'facilities', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'wheelchair_assistance',
      reply: 'Wheelchair assistants meet passengers at the Special Assistance counter located right inside Departure Gate 1 for Terminal 3. Dedicated porter assistance is provided through security to the aircraft door.'
    },
    {
      subject: 'Baggage damaged on carousel 5 arrival flight AI-102',
      description: 'My Samsonite hard-shell suitcase arrived on carousel 5 with a cracked frame and broken wheel. Filed Property Irregularity Report (PIR) with airport staff.',
      category: 'baggage', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.82, intent: 'damaged_baggage_pir',
      reply: 'Your Property Irregularity Report DELAI88102 is active. Air India baggage claims department is processing your claim for luggage repair or replacement compensation.'
    },
    {
      subject: 'Indigo flight 6E-204 departure gate change announcement missed',
      description: 'Gate was changed from 14 to 32B without clear audible announcement, causing multiple passengers to rush across the terminal.',
      category: 'flights', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'gate_change_feedback',
      reply: 'We regret the inconvenience. Delhi Airport Flight Information Display (FIDS) screens and the Delhi Airport mobile app update gate changes in real-time. Audio broadcast volume at zone C has been increased.'
    },
    {
      subject: 'Encalm Lounge access eligibility with Visa Signature card',
      description: 'Does an HDFC Visa Signature credit card qualify for complimentary entry at the Encalm Lounge in T3 Domestic Departures?',
      category: 'facilities', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'lounge_eligibility',
      reply: 'Yes, Encalm Lounge T3 Domestic accepts HDFC Visa Signature cards subject to quarterly lounge swipe eligibility limits. A nominal authorization fee of ₹2 applies.'
    },
    {
      subject: 'Delhi Metro Airport Express smart card refund at station',
      description: 'Purchased an Airport Express token at T3 metro station but flight was delayed so did not travel. Can I get a cash refund for the unused token?',
      category: 'terminals', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'metro_token_refund',
      reply: 'Unused Airport Express single journey tokens are eligible for full refund at the originating metro station customer care counter within 60 minutes of purchase.'
    },
    {
      subject: 'Duty-free alcohol bottle liquid allowance in international transit',
      description: 'Purchased 2 bottles of single malt whiskey at Dubai duty-free in sealed STEB tamper-evident bags. Can I carry them through security for domestic connection?',
      category: 'security', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'duty_free_liquids_transit',
      reply: 'For domestic connecting flights departing India, cabin baggage liquid restrictions of 100ml apply strictly. Duty-free alcohol bottles must be checked in as hold luggage before domestic security screening.'
    },
    {
      subject: 'Lost passport reported at immigration departure clearance',
      description: 'Passenger left Indian passport in the restroom adjacent to immigration clearance hall counter 18.',
      category: 'security', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.88, intent: 'lost_passport_airport',
      reply: 'Immigration supervisor and CISF have retrieved the passport and deposited it at the Terminal 3 Shift Duty Office. Please present photo ID to claim it.'
    },
    {
      subject: 'Pet relocation cargo policy inquiry for domestic dog travel',
      description: 'What are the terminal entry requirements for travelling with a 15kg Golden Retriever on Air India as manifest cargo?',
      category: 'flights', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'pet_cargo_policy',
      reply: 'Pets travelling as manifest cargo must be booked via IATA approved live animal container through the airline cargo terminal 4 hours prior to flight departure with a valid veterinary fitness certificate.'
    },
    {
      subject: 'Overnight transit sleeping pod booking at T3 arrival',
      description: 'Can I book a sleeping pod at the Snooze at My Space lounge inside T3 transit area for a 6-hour layover?',
      category: 'facilities', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'sleeping_pod_booking',
      reply: 'Yes, Snooze At My Space sleeping pods are located inside T3 International Departures near Gate 17. Pods are equipped with high-speed Wi-Fi, charging ports, and flat beds bookable by the hour.'
    },
    {
      subject: 'Valet parking key handover delay during peak hours',
      description: 'Waited 40 minutes for my vehicle to be brought to the T3 arrivals valet retrieval booth at midnight.',
      category: 'parking', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.90, intent: 'valet_delay_complaint',
      reply: 'We sincerely apologize for the delay during midnight peak arrivals. We have doubled the valet retrieval runner team during 11:00 PM to 2:00 AM flight banks.'
    },
    {
      subject: 'Baby stroller availability at T2 security check',
      description: 'Are complimentary baby strollers provided after security check for parents travelling with infants at Terminal 2?',
      category: 'facilities', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'stroller_availability',
      reply: 'Yes, complimentary baby strollers are stationed immediately after security frisking at Terminal 2 and Terminal 3. Strollers can be used up to the aircraft boarding gate.'
    },
    {
      subject: 'Unattended suspicious baggage reported near Food Court T3',
      description: 'Unattended black duffle bag noticed under seat near Subway food court for over 30 minutes with no owner visible.',
      category: 'security', priority: 'critical', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'suspicious_baggage_alert',
      reply: 'CISF Bomb Detection & Disposal Squad (BDDS) and Quick Reaction Team were dispatched immediately. The baggage was safely inspected and reunited with a passenger who had misplaced it.'
    },
    {
      subject: 'Currency exchange transaction receipt and commission query',
      description: 'Exchanged 500 US Dollars to Indian Rupees at Central Bank booth in arrivals. The service charge was 8% above market rate.',
      category: 'facilities', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.89, intent: 'forex_charges_inquiry',
      reply: 'Airport currency exchange booths operate under authorized dealer Category II RBI licenses with published daily board rates inclusive of airport facility access surcharge.'
    },
    {
      subject: 'Flight delay certificate request for insurance claim',
      description: 'Flight UK-995 was delayed by 5 hours due to technical inspection on 19 October. Need an official delay certificate for travel insurance.',
      category: 'flights', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'delay_certificate_request',
      reply: 'Flight delay verification certificates are issued directly by the operating airline. You can generate an official Vistara Flight Delay Certificate online using your PNR and ticket number.'
    },
    {
      subject: 'Lost trolley bag on arrival belt 8 from Dubai flight',
      description: 'Checked 2 bags on Emirates EK-510; only 1 bag arrived on carousel 8. Black American Tourister bag missing.',
      category: 'baggage', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.83, intent: 'missing_baggage_tracking',
      reply: 'WorldTracer bag tracking record DEL-EK-2610-880 has been created. The bag was misrouted at DXB and is arriving on the next flight EK-512 at 8:40 PM.'
    },
    {
      subject: 'Premium Meet & Greet GMR service booking assistance',
      description: 'Need VIP escort and buggy assistance through immigration and customs for high-profile business delegate arriving tomorrow.',
      category: 'facilities', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'meet_and_greet_service',
      reply: 'Atithya Meet & Greet service has confirmed booking REF-ATG-9904. A dedicated guest relations officer will welcome the delegate at the aerobridge with buggy transport.'
    },
    {
      subject: 'EV charging slot reservation in T3 premium parking',
      description: 'Can I pre-reserve a fast DC charging slot for my electric vehicle in the MLCP parking for tomorrow afternoon?',
      category: 'parking', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'ev_charging_reservation',
      reply: 'EV charging stations operate on a first-come, first-served basis on Level 2 of T3 MLCP. Real-time charger occupancy is visible on the Delhi Airport mobile app.'
    },
    {
      subject: 'Smoking lounge ventilation and cleanliness issue',
      description: 'Exhaust fan in the smoking lounge near Gate 36 T3 domestic was malfunctioning, creating heavy smoke buildup.',
      category: 'facilities', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'smoking_lounge_maintenance',
      reply: 'Air handling and smoke filtration unit in Smoking Lounge 36 has been serviced and air quality sensors recalibrated.'
    },
    {
      subject: 'Boarding pass scanner error at boarding gate 14B',
      description: 'Mobile boarding pass QR code repeatedly failed on scanner during boarding call for Indigo flight.',
      category: 'flights', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.90, intent: 'boarding_scanner_error',
      reply: 'Optical scanner glass at Gate 14B was cleaned. Gate agents are equipped with backup handheld barcode scanners to prevent passenger boarding delays.'
    },
    {
      subject: 'Medication liquids exceeding 100ml security clearance',
      description: 'Travelling with insulin injections and liquid cough syrup exceeding 100ml. What medical documents are required at CISF security?',
      category: 'security', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'liquid_medication_clearance',
      reply: 'Essential liquid medicines exceeding 100ml are permitted in cabin baggage if accompanied by a doctor prescription matching the passenger name. Declare them to security officers before X-ray screening.'
    },
    {
      subject: 'Tight inter-terminal connection between T2 and T3',
      description: 'Arriving at T2 at 18:10 with international connection departing T3 at 19:40. Will I make the flight?',
      category: 'terminals', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.85, intent: 'tight_connection_assistance',
      reply: 'Minimum Connecting Time (MCT) between T2 and T3 is 90 minutes. Our terminal transfer team has arranged priority shuttle transit to expedite your connection.'
    },
    {
      subject: 'Lost laptop at security X-ray scanning tray',
      description: 'Left silver MacBook Air in security screening tray at T3 central security checkpoint around 9:30 AM.',
      category: 'security', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.84, intent: 'lost_laptop_security',
      reply: 'A silver MacBook Air recovered from Security Lane 8 has been secured at the CISF Lost Property Room. Please provide the serial number to claim it.'
    },
    {
      subject: 'Baby care room hygiene complaint near T3 Gate 14',
      description: 'Diaper disposal bin was overflowing and sanitizing wipes were empty at the baby care room near Gate 14.',
      category: 'facilities', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'baby_care_room_hygiene',
      reply: 'Housekeeping supervisor has dispatched deep cleaning crew to Baby Care Room 14. Stock of diaper disposal liners and antiseptic wipes has been replenished.'
    },
    {
      subject: 'Flight cancelled due to low visibility fog protocol',
      description: 'What are the re-booking and refreshment options provided when morning flights are delayed under CAT III fog operations?',
      category: 'flights', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.78, intent: 'fog_delay_protocol',
      reply: 'Under DGCA passenger charter, airlines provide complimentary meals for delays exceeding 2 hours and free rebooking or full refund for cancelled flights.'
    },
    {
      subject: 'Parking ticket barcode unreadable at exit boom barrier',
      description: 'Moisture on paper parking ticket prevented exit barcode reader from scanning at T2 parking gate.',
      category: 'parking', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'parking_barcode_error',
      reply: 'Parking attendants at manual toll booth can verify vehicle entry timestamp using automatic number plate recognition (ANPR) cameras.'
    },
    {
      subject: 'Wheelchair battery transport guidelines for electric wheelchair',
      description: 'Can I bring my motorized electric wheelchair with a lithium-ion battery on board as checked baggage?',
      category: 'security', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'electric_wheelchair_battery',
      reply: 'Lithium-ion wheelchair batteries up to 300 Wh must be removed and carried into the passenger cabin. Dry cell or gel batteries can remain attached if terminals are insulated.'
    },
    {
      subject: 'Duplicate receipt for excess baggage payment',
      description: 'Need an official tax invoice receipt for Rs 3,600 paid for 6kg excess luggage at Air India ticketing counter.',
      category: 'baggage', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'excess_baggage_receipt',
      reply: 'Electronic excess baggage tax invoice can be generated from the airline customer portal using your Miscellaneous Charges Order (MCO) number.'
    },
    {
      subject: 'T3 arrivals taxi kiosk overcharging complaint',
      description: 'Driver at prepaid taxi booth demanded additional cash over and above the computerized prepaid slip receipt.',
      category: 'terminals', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.79, intent: 'taxi_overcharge_complaint',
      reply: 'Complaint forwarded to Delhi Traffic Police Airport Cell. Drivers demanding extra fare are liable to suspension of airport commercial permit.'
    },
    {
      subject: 'Delayed baggage compensation claim following 48-hour delay',
      description: 'Suitcase on flight from Frankfurt arrived 52 hours late. Clothes and toiletries were purchased out of pocket.',
      category: 'baggage', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'baggage_delay_compensation',
      reply: 'Under the Montreal Convention, reasonable interim expenses for delayed luggage are reimbursable upon submission of itemized purchase receipts.'
    },
    {
      subject: 'Oxygen cylinder permission for medical passenger',
      description: 'Travelling with elderly chronic pulmonary patient requiring portable oxygen concentrator (POC) during flight.',
      category: 'security', priority: 'critical', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'medical_oxygen_permission',
      reply: 'FAA-approved Portable Oxygen Concentrators (POC) are permitted in the cabin. Ensure MEDIF medical clearance form is approved by the airline medical board 48 hours prior.'
    },
    {
      subject: 'Airport Wi-Fi OTP not received on international roaming SIM',
      description: 'Unable to connect to GMR Free Wi-Fi at T3 arrivals because SMS OTP does not arrive on UK Vodafone number.',
      category: 'facilities', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'wifi_kiosk_pass',
      reply: 'International passengers can scan their passport at any Wi-Fi Kiosk located throughout the arrival piers to receive an instant Wi-Fi access voucher code.'
    },
    {
      subject: 'Gate closure time inquiry for international flights',
      description: 'How many minutes before scheduled departure does the boarding gate close for Emirates and British Airways flights at T3?',
      category: 'flights', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'gate_closure_times',
      reply: 'Boarding gates for all international departures close strictly 20 minutes before scheduled departure time. Passengers must clear security at least 60 minutes before.'
    },
    {
      subject: 'Long-term parking rates for 7 days holiday travel',
      description: 'What is the daily discount rate for leaving a car in T3 Multi-Level Parking for one week?',
      category: 'parking', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'longterm_parking_rates',
      reply: 'Long-term parking at T3 MLCP is ₹600 for the first 24 hours and ₹400 for each subsequent 24-hour block. Pre-booking discounts are available via Park+.'
    },
    {
      subject: 'Left Bose headphones in seating area Gate 41',
      description: 'Black Bose QuietComfort 45 headphones left on seat opposite boarding gate 41 around 11 PM on 22 Oct.',
      category: 'baggage', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.80, intent: 'lost_headphones',
      reply: 'Headphones matching description have been logged under Lost & Found item ID LF-DEL-2610-912. Available for verification and collection at T3.'
    },
    {
      subject: 'Priority security lane access for business class ticket',
      description: 'Does a premium economy ticket allow access to the fast-track priority security lane at T3 departures?',
      category: 'security', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'priority_security_access',
      reply: 'Fast-track priority security lane is reserved exclusively for First and Business Class passengers, Commercially Important Persons (CIP), and airline top-tier frequent flyers.'
    },
    {
      subject: 'Transit hotel booking cancellation and refund policy',
      description: 'Connecting flight rescheduled by airline. Need to cancel reservation at Holiday Inn Express transit hotel inside T3.',
      category: 'facilities', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'transit_hotel_cancellation',
      reply: 'Transit hotel bookings cancelled due to verified airline schedule changes are eligible for waiver of late cancellation fees upon submission of revised itinerary.'
    },
    {
      subject: 'Oversized baggage (guitar case) special handling',
      description: 'Travelling with fragile acoustic guitar in hard flight case. Where is the oversized baggage drop counter located at T3?',
      category: 'baggage', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'oversized_baggage_counter',
      reply: 'Oversized baggage check-in counter is located adjacent to Check-in Row P in Terminal 3. Hand-carried musical instruments within dimensions can also travel in cabin.'
    },
    {
      subject: 'Terminal 1 new departure building drop-off lane traffic',
      description: 'Is the new elevated flyover operational for direct drop-off at Terminal 1 departures building?',
      category: 'terminals', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'terminal_1_dropoff',
      reply: 'Yes, the new dedicated elevated flyover connects directly to the Terminal 1 departures forecourt with multi-lane automated drop-off bays.'
    },
    {
      subject: 'Delayed international arrival flight status verification',
      description: 'Waiting for passenger arriving on Lufthansa LH-760 from Munich. FIDS displays delayed with no estimated time.',
      category: 'flights', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'flight_status_check',
      reply: 'Lufthansa flight LH-760 touched down at 15:42 on Runway 28. Passengers are currently clearing immigration and baggage retrieval at carousel 12.'
    },
    {
      subject: 'Power bank capacity limitation guidelines for cabin baggage',
      description: 'Can I carry two 20,000 mAh power banks in my cabin backpack through airport security screening?',
      category: 'security', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'power_bank_limits',
      reply: 'Power banks up to 100 Wh (approximately 27,000 mAh) are permitted in cabin baggage (maximum 2 per passenger). Power banks are strictly prohibited in checked-in hold luggage.'
    },
    {
      subject: 'Fast food outlet billing discrepancy in T2 departure',
      description: 'Charged Rs 450 for a combo meal priced at Rs 380 on the display menu board at T2 food court.',
      category: 'facilities', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'concessionaire_overcharge',
      reply: 'The concessionaire has refunded the differential amount of ₹70. All food outlets are mandated to adhere strictly to published displayed pricing.'
    },
    {
      subject: 'Medical room emergency response time at T3',
      description: 'Passenger felt severe dizziness and chest discomfort near departure gate 30. Medical team response was excellent.',
      category: 'facilities', priority: 'critical', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'medical_emergency_feedback',
      reply: 'Thank you for your commendation. Medanta 24x7 emergency medical centers are stationed across all terminals with ACLS ambulances and critical care doctors.'
    },
    {
      subject: 'Lost car keys in airport shuttle bus',
      description: 'Key fob with Honda car key dropped in complimentary transfer bus while travelling from T1 to T3 around 3 PM.',
      category: 'baggage', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.79, intent: 'lost_keys_shuttle',
      reply: 'Vehicle depot supervisor has recovered a Honda remote key from bus DL-1P-9902. The key has been handed over to T3 Lost & Found desk.'
    },
    {
      subject: 'Parking lost ticket penalty charges waiver',
      description: 'Lost paper parking slip but can prove vehicle entry time through Fastag SMS timestamp.',
      category: 'parking', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'lost_parking_ticket',
      reply: 'Lost ticket administrative fee was waived upon verification of the vehicle license plate entry image on our ANPR parking surveillance system.'
    },
    {
      subject: 'Transit visa requirement for 10-hour layover at Delhi',
      description: 'US citizen holding onward ticket to Kathmandu with a 10-hour layover at T3. Is an Indian transit visa required?',
      category: 'flights', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'transit_visa_rules',
      reply: 'Passengers with onward connecting international tickets on the same PNR who remain within the international transit area do not require an Indian transit visa.'
    },
    {
      subject: 'Mobile phone recovered from cab at departure ramp',
      description: 'Forgot Samsung Galaxy phone in Uber cab when dropped off at T3 Gate 4. Driver deposited phone with airport staff.',
      category: 'security', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'recovered_phone_collection',
      reply: 'The Samsung device has been safely logged with CISF Terminal Operations Duty Room. You can retrieve it with valid IMEI or PIN unlock verification.'
    }
  ],

  passportseva: [
    {
      subject: 'Tatkaal passport appointment availability at PSK Herald House',
      description: 'Need urgent passport renewal for unexpected international conference next week. Are Tatkaal appointments available at Delhi PSK?',
      category: 'tatkaal', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'tatkaal_appointment_booking',
      reply: 'Tatkaal appointment slots open daily at 11:00 AM sharp on the Passport Seva portal. Ensure your application fee is pre-paid to secure available slots instantly.'
    },
    {
      subject: 'Police verification report pending at Lajpat Nagar PS for 4 weeks',
      description: 'Attended PSK appointment on 25 September. Local police station in Lajpat Nagar has not completed verification visit after 28 days.',
      category: 'police_verification', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.82, intent: 'police_verification_delay',
      reply: 'We have sent an automated reminder to the Deputy Commissioner of Police (Special Branch) Delhi. You may also contact the District Police HQ Verification Cell.'
    },
    {
      subject: 'Speed post tracking number not generated after passport printed',
      description: 'Application status shows "Passport has been printed" since 15th October, but no tracking consignment number has been provided.',
      category: 'dispatch', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'dispatch_tracking_number',
      reply: 'Your passport has been handed over to the Department of Posts under Speed Post Consignment Number PP884102919IN. Expected delivery is within 2-3 working days.'
    },
    {
      subject: 'Renewal of 10-year passport expired 6 months ago',
      description: 'My regular 36-page adult passport expired in April 2026. What documents are required for renewal, and will police verification be mandatory?',
      category: 'documents', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'expired_passport_renewal',
      reply: 'Passports renewed within 3 years of expiry require only self-attested copies of the first two and last two pages of the old passport along with Aadhaar. Police verification is generally Post-Issuance.'
    },
    {
      subject: 'Surname split request on passport re-issue',
      description: 'My existing passport has my full name in the "Given Name" field while "Surname" is blank. Want to split name into First Name and Surname for US visa.',
      category: 'documents', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.78, intent: 'name_split_procedure',
      reply: 'Splitting given name and surname without altering the letters of your name does not require gazette notification. Submit an application for Re-issue (Change in Personal Particulars) with Aadhaar.'
    },
    {
      subject: 'Rescheduling missed appointment at Post Office PSK (POPSK)',
      description: 'Missed scheduled appointment at Yamuna Nagar POPSK yesterday due to medical emergency. How many times can I reschedule?',
      category: 'appointment', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'reschedule_appointment_limit',
      reply: 'Applicants can reschedule passport appointments up to three times within one year from the original payment date via the Passport Seva portal.'
    },
    {
      subject: 'Annexure E affidavit format for urgent business travel',
      description: 'Applying under Tatkaal scheme. Is Annexure E required to be attested on non-judicial stamp paper by a notary or magistrate?',
      category: 'tatkaal', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'annexure_e_affidavit',
      reply: 'Annexure E is a standard self-declaration of citizenship and criminal antecedents on plain paper. Notarization or judicial stamp paper is not required under revised passport guidelines.'
    },
    {
      subject: 'Minor passport application without father consent (sole custody)',
      description: 'Mother applying for 8-year-old child passport following legal divorce. Court order grants sole legal custody. What annexure is required?',
      category: 'application', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'minor_passport_single_parent',
      reply: 'Submit Annexure C (declaration by single parent) along with a certified copy of the family court judgment granting sole legal custody.'
    },
    {
      subject: 'Fee paid on Bharatkosh portal deducted twice but receipt pending',
      description: 'Transferred Rs 1,500 via SBI Net Banking on Bharatkosh. Account was debited twice but application shows payment pending.',
      category: 'application', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'double_fee_payment',
      reply: 'Payment reconciliation runs every 24 hours. The duplicate debit of ₹1,500 has been verified and refund will credit to your account within 7 working days.'
    },
    {
      subject: 'Damaged passport replacement: washed in laundry',
      description: 'Accidentally washed passport booklet in washing machine. Inner visa pages are blurred but front laminated identity page is legible.',
      category: 'documents', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'damaged_passport_procedure',
      reply: 'Passports with readable identity pages are classified as Damaged (partially readable). Apply for Re-issue under Damaged Passport category along with Annexure F.'
    },
    {
      subject: 'Change of address update with new DigiLocker Aadhaar',
      description: 'Bought a new apartment in Noida. Can I fetch my updated Aadhaar directly via DigiLocker during appointment at PSK?',
      category: 'documents', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'digilocker_aadhaar_verification',
      reply: 'Yes, DigiLocker integration is fully supported at all PSKs. Verifying your digital Aadhaar through DigiLocker eliminates the need for physical address verification documents.'
    },
    {
      subject: 'Emigration Check Required (ECR) to Non-ECR conversion proof',
      description: 'Have old ECR passport issued when I was a student. Now have graduate degree from Delhi University. How to remove ECR stamp?',
      category: 'documents', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'non_ecr_conversion',
      reply: 'Submit self-attested copies of your 10th standard passing certificate or university degree certificate during re-issue to qualify automatically for Non-ECR status.'
    },
    {
      subject: 'Police verification marked adverse due to tenant address check',
      description: 'Police officer visited rental flat when I was in office. Report marked "Applicant not residing at given address". How to appeal?',
      category: 'police_verification', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.83, intent: 'adverse_pvr_appeal',
      reply: 'You have been issued a clarification notice. Please visit the Regional Passport Office with your registered rent agreement and electricity bill to initiate a fresh re-verification.'
    },
    {
      subject: 'Re-issue of passport lost during foreign travel',
      description: 'Passport was stolen while on holiday in Europe. Returned to India on Emergency Certificate (EC). What documents to submit for new passport?',
      category: 'application', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.82, intent: 'lost_passport_abroad',
      reply: 'Apply for Re-issue (Lost Category) with the original Emergency Certificate issued by the Indian Embassy, overseas police theft report, and local police non-traceable report.'
    },
    {
      subject: 'Police Clearance Certificate (PCC) application for Canada PR',
      description: 'Applied for PCC on 10th October. Does the PCC processing require a separate physical police verification visit to home?',
      category: 'application', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'pcc_process_timeline',
      reply: 'Yes, for PCC applications where earlier police verification is older than 6 months, a fresh police verification report is obtained before PCC issuance.'
    },
    {
      subject: 'Biometric fingerprint scanner error during appointment Counter B',
      description: 'Senior citizen grandmother had difficulty capturing all 10 fingerprints at Counter B due to worn ridge patterns.',
      category: 'appointment', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'biometric_exception',
      reply: 'In accordance with passport guidelines, applicants with eroded fingerprints are granted medical biometric exception with facial photograph capture only.'
    },
    {
      subject: 'Diplomatic/Official passport application processing timeline',
      description: 'Submitted Official (White) passport request on deputation to Ministry of Commerce. How long does CPV Division take to issue?',
      category: 'application', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'diplomatic_passport_timeline',
      reply: 'Official and Diplomatic passports processed at CPV Division, Patiala House are typically ready for collection within 3-5 working days following political clearance.'
    },
    {
      subject: 'Urgent medical emergency passport dispatch request',
      description: 'Father scheduled for critical organ transplant surgery in Singapore on Monday. Passport is pending at RPO Delhi.',
      category: 'tatkaal', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.91, intent: 'medical_emergency_passport',
      reply: 'Case escalated to Regional Passport Officer under emergency medical protocol. Passport printing has been completed and handover is arranged for today at RPO.'
    },
    {
      subject: 'Name change after marriage: gazette notification requirement',
      description: 'Do I need a newspaper advertisement or gazette notification to add my husband surname to my passport after marriage?',
      category: 'documents', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'post_marriage_name_change',
      reply: 'No gazette notification is required. Adding your spouse surname requires only self-attested copies of your Marriage Certificate and existing passport.'
    },
    {
      subject: 'Speed post parcel returned to RPO: consignee not available',
      description: 'Postman returned passport parcel to RPO Delhi marked "Door locked". How do I collect my undelivered passport?',
      category: 'dispatch', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.84, intent: 'undelivered_passport_collection',
      reply: 'Returned undelivered passports can be collected in person from the RPO Public Enquiry Counter on working days between 9:30 AM and 12:30 PM with government photo ID.'
    },
    {
      subject: 'Tatkaal verification certificate Annexure F authority signature',
      description: 'Can an Under Secretary to the Government of India sign Annexure F Verification Certificate for Tatkaal passport?',
      category: 'tatkaal', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'annexure_f_signatory',
      reply: 'Yes, Officers of the rank of Under Secretary to the Government of India or above are authorized competent authorities to issue Annexure F verification certificates.'
    },
    {
      subject: 'Passport status stuck at review at Regional Passport Office',
      description: 'Application ARN 26-00448192 has been in "Passport is under review at RPO" status for 18 days. No notice received.',
      category: 'application', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.77, intent: 'status_under_review',
      reply: 'Your file is in final supervisory scrutiny queue following receipt of clear police verification. The file has been cleared for printing.'
    },
    {
      subject: 'Document Advisor query for applicant born before 26 Jan 1989',
      description: 'Do applicants born prior to 1989 require a mandatory municipal birth certificate, or is School Leaving Certificate accepted as proof of date of birth?',
      category: 'documents', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'dob_proof_before_1989',
      reply: 'Under amended Passport Rules, School Leaving Certificate, PAN card, or Service Record extract is accepted as valid proof of date of birth for all applicants.'
    },
    {
      subject: 'Appointment cancellation fee refund inquiry',
      description: 'Cancelled PSK appointment 2 days in advance. Is the passport application fee refunded or retained for future booking?',
      category: 'appointment', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'appointment_fee_validity',
      reply: 'Passport application fees are non-refundable. However, the fee payment remains valid for 365 days from the date of payment for re-booking.'
    },
    {
      subject: 'Police verification re-initiation request after address correction',
      description: 'House number had a typo in initial application causing police verification return. Corrected house number submitted at RPO.',
      category: 'police_verification', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'reinitiate_pvr',
      reply: 'Fresh Police Verification Request has been transmitted electronically to the jurisdictional police district station with the updated address details.'
    },
    {
      subject: 'Passport dispatch delayed due to booklet printing queue',
      description: 'Passed through counter C approval on 12 October. Why is printing taking more than one week?',
      category: 'dispatch', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.75, intent: 'printing_delay_query',
      reply: 'Printing of standard 36-page booklets has resumed normal capacity at the Security Printing Press. Your passport is slated for dispatch tomorrow.'
    },
    {
      subject: 'Correction of spelling error in mother name on issued passport',
      description: 'Received new passport yesterday but mother name has spelling mistake ("Sangeeta" printed instead of "Sangita" as in 10th certificate).',
      category: 'documents', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'parent_name_spelling_error',
      reply: 'If the error was made by the passport office contrary to documents submitted, a gratis replacement passport is issued without re-charging passport fees.'
    },
    {
      subject: 'Senior citizen walk-in token eligibility at PSK',
      description: 'Can an 82-year-old pensioner walk into PSK Gurgaon without prior online appointment booking?',
      category: 'appointment', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'senior_citizen_walkin',
      reply: 'Senior citizens aged 60 and above with pre-filled online application forms are eligible for walk-in appointments with priority token issuance at designated PSKs.'
    },
    {
      subject: 'PCC appointment date rescheduling for Australian visa',
      description: 'Need to advance my PCC appointment date to meet the Department of Home Affairs 28-day document submission deadline.',
      category: 'application', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'pcc_rescheduling',
      reply: 'Log into your account on the Passport Seva portal and select "Schedule Appointment > Reschedule". Early slots are frequently released at 11:00 AM.'
    },
    {
      subject: 'Student passport renewal during ongoing semester exams',
      description: 'Can I apply for passport renewal in Delhi while my permanent home address is in Lucknow?',
      category: 'application', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'student_current_address',
      reply: 'Yes, students studying away from home can apply at the PSK under whose jurisdiction their college/hostel falls by providing a Bonafide Student Certificate.'
    },
    {
      subject: 'Clarification on Annexure D for minor passport',
      description: 'Is Annexure D required to be signed by both parents when both parents hold valid passports?',
      category: 'documents', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'annexure_d_minor',
      reply: 'Yes, Annexure D is a mandatory joint declaration signed by both parents giving consent for the issuance of a passport to the minor child.'
    },
    {
      subject: 'Lost passport FIR and non-traceable report submission',
      description: 'Local police station provided online e-FIR for lost passport. Does RPO require a non-traceable certificate in addition to the e-FIR?',
      category: 'application', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'lost_passport_fir',
      reply: 'A digitally verified e-FIR registered with State Police clearly mentioning the lost passport booklet number is accepted as valid proof of loss.'
    },
    {
      subject: 'Police verification completed: RPO clearance pending',
      description: 'Local police station confirmed sending clear verification report on 14th Oct. Passport portal still shows "Police report is awaited".',
      category: 'police_verification', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.76, intent: 'police_portal_sync',
      reply: 'Police verification reports route through the District Police Special Branch for security clearance before synchronizing with the central passport system.'
    },
    {
      subject: 'Jumbo passport booklet (60 pages) request for frequent flyer',
      description: 'Frequent business travel fills regular passport in 2 years. Can I opt for a 60-page booklet on normal fee?',
      category: 'application', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'jumbo_booklet_request',
      reply: 'Yes, you can select the 60-page Jumbo Booklet option on the application form. The fee for a 60-page booklet is ₹2,000 (compared to ₹1,500 for 36 pages).'
    },
    {
      subject: 'Passport tracking shows Dispatched but speed post says Invalid Consignment',
      description: 'Received tracking number yesterday. India Post tracking website returns "Consignment details not found".',
      category: 'dispatch', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'speedpost_tracking_error',
      reply: 'Consignments appear on the India Post tracking portal once scanned at the Delhi National Sorting Hub (typically 12-24 hours after RPO dispatch).'
    },
    {
      subject: 'Appointment booking slot opening time in Delhi NCR',
      description: 'At what time do appointment slots open for PSK Herald House, Shalimar Place, and Gurgaon on weekdays?',
      category: 'appointment', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'appointment_opening_time',
      reply: 'Appointment slots for all PSK and POPSK centers under Regional Passport Office Delhi open daily from Monday to Friday at exactly 11:00 AM.'
    },
    {
      subject: 'Newborn infant passport application requirements',
      description: 'Applying for 3-month-old infant. Are parents required to be present together with the baby at the PSK?',
      category: 'application', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'newborn_passport_rules',
      reply: 'The infant must be physically present at the PSK for biometric photo capture. Either parent can accompany the infant along with both parents original passports.'
    },
    {
      subject: 'Address verification with registered rent agreement validity',
      description: 'Does the registered rent agreement need to be for a period of more than one year to qualify as address proof?',
      category: 'documents', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'rent_agreement_proof',
      reply: 'A registered rent agreement executed under the Registration Act 1908 is valid as address proof. Unregistered notary rent agreements are not accepted.'
    },
    {
      subject: 'Show Cause Notice received from RPO regarding undisclosed court case',
      description: 'Received letter SCN-26-8891 citing Section 12(1)(b) of Passports Act 1967. How to submit explanation within 30 days?',
      category: 'application', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.83, intent: 'show_cause_notice',
      reply: 'You must submit a written reply addressing the Regional Passport Officer along with certified copies of the relevant court order or trial court NOC.'
    },
    {
      subject: 'Damaged passport: photo page intact but back cover ripped',
      description: 'Back cover of passport booklet was torn by pet dog. Biometric page and all previous visas are clean.',
      category: 'documents', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'damaged_passport_classification',
      reply: 'This is categorized as partially damaged passport. Apply for Re-issue under Damaged category; all valid visas in the damaged booklet remain valid.'
    },
    {
      subject: 'Non-ECR eligibility with 3 years IT returns',
      description: 'Do self-employed professionals without a college degree qualify for Non-ECR status based on income tax returns?',
      category: 'documents', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'non_ecr_tax_returns',
      reply: 'Yes, assessment orders or ITR-V receipts showing payment of income tax for the last one year or more qualify an applicant for Non-ECR endorsement.'
    },
    {
      subject: 'Tatkaal document checklist verification before PSK visit',
      description: 'I have Aadhaar, PAN card, and Voter ID card. Do these 3 documents satisfy the Tatkaal 3-document requirement?',
      category: 'tatkaal', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'tatkaal_3_document_rule',
      reply: 'Yes, Aadhaar card, PAN card, and Electors Photo Identity Card (EPIC) are all recognized under the list of 13 approved documents for Tatkaal issuance.'
    },
    {
      subject: 'Urgent travel due to death of family member abroad',
      description: 'Need emergency passport to attend funeral of brother in Dubai tomorrow morning.',
      category: 'tatkaal', priority: 'critical', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'emergency_death_case',
      reply: 'Emergency out-of-turn passport service is operational 24x7 at Regional Passport Offices upon presentation of death certificate and embassy telegram.'
    },
    {
      subject: 'Duplicate fee payment refund status on SBI ePay',
      description: 'SBI ePay reference 99041281 deducted ₹1,500 twice on 18th Oct. Refund has not reached my HDFC bank account.',
      category: 'application', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'epay_refund_tracking',
      reply: 'The failed gateway charge was refunded under reference EPAY-REF-2610-880. Bank settlement turnaround is 5-7 working days.'
    },
    {
      subject: 'Passport surrendered upon acquiring foreign citizenship',
      description: 'Acquired German citizenship. Need to obtain official Surrender Certificate to apply for OCI card.',
      category: 'application', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'passport_surrender_certificate',
      reply: 'Apply online for "Surrender of Indian Passport", submit your Indian passport and German naturalization certificate at the PSK to receive your Surrender Certificate.'
    },
    {
      subject: 'Verification of passport authenticity for employment visa',
      description: 'Prospective employer background verification team requesting online confirmation of passport validity.',
      category: 'application', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'passport_authenticity_check',
      reply: 'Employers can verify passport authenticity through the government mPassport Seva app or via authorized DigiLocker document verification services.'
    },
    {
      subject: 'Police station changed after jurisdiction reorganization',
      description: 'Police verification was marked sent to Old Police Station which is now bifurcated into New Sector Station.',
      category: 'police_verification', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'police_station_bifurcation',
      reply: 'The jurisdictional mapping has been updated in the CCTNS portal and the verification docket re-assigned to the new Sector Police Station.'
    },
    {
      subject: 'Dispatched passport delivery address change request',
      description: 'Can I change delivery address for my dispatched passport after Speed Post consignment number is generated?',
      category: 'dispatch', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'dispatch_address_change',
      reply: 'For security reasons, Speed Post passport consignments can only be delivered to the verified residential address printed on the envelope.'
    },
    {
      subject: 'Signature change request on passport renewal',
      description: 'My signature has changed since my first passport was issued 10 years ago. Do I need an affidavit to change signature?',
      category: 'documents', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'signature_change_renewal',
      reply: 'No affidavit is required. Sign the physical application form with your new signature at Counter A during your PSK biometric appointment.'
    },
    {
      subject: 'Online application form submitted with wrong date of birth',
      description: 'Entered 14-08-1994 instead of 14-08-1995 on the online portal before booking appointment. Can this be edited at the counter?',
      category: 'application', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'edit_application_at_psk',
      reply: 'Yes, clerical corrections to personal particulars can be made by the verification officer at Counter A during your PSK visit upon showing your original birth certificate.'
    }
  ],

  infosys: [
    {
      subject: 'Corporate Dell Latitude laptop blue screen error during client demo',
      description: 'Corporate laptop crashed with BSOD error code CRITICAL_PROCESS_DIED. Restart loops back to BitLocker recovery screen.',
      category: 'it_support', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'bsod_bitlocker_recovery',
      reply: 'You can retrieve your 48-digit BitLocker recovery key by logging into the Infosys Self-Service Portal (https://mydevices.infosys.com) with your corporate credentials and mobile authenticator.'
    },
    {
      subject: 'GlobalProtect VPN connection dropped from home broadband',
      description: 'VPN disconnects every 10 minutes when connected to Airtel Xstream Wi-Fi. IPsec tunnel handshake timeout error.',
      category: 'it_support', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.79, intent: 'vpn_disconnect_issue',
      reply: 'This is commonly resolved by switching the GlobalProtect gateway from primary APAC-IN to secondary APAC-MUMBAI and enabling MTU size clamping.'
    },
    {
      subject: 'Mysuru training campus hostel room allotment check-in details',
      description: 'Onboarding batch of October 2026 arriving at Mysuru campus on Sunday. Where is the accommodation key collection counter?',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'mysuru_hostel_checkin',
      reply: 'Hostel keys and RFID smart access cards are issued 24x7 at the Employee Care Centre (ECC) Reception located inside Gate 2 of the Mysuru Development Centre.'
    },
    {
      subject: 'Medical insurance cashless claim card not activating at hospital',
      description: 'Admitted family member to Fortis Hospital for emergency appendectomy. Medi Assist cashless TPA card says policy inactive.',
      category: 'benefits', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.88, intent: 'cashless_mediclaim_activation',
      reply: 'Your corporate group health insurance under policy INF-GMC-2601 has been re-verified with Medi Assist. Cashless pre-authorization approval of ₹1,50,000 has been sent to Fortis TPA desk.'
    },
    {
      subject: 'Employee Provident Fund (EPF) transfer from TCS (Form 13) pending',
      description: 'Submitted online transfer request on EPFO unified portal 2 months ago. Status is stuck at "Pending employer attestation".',
      category: 'benefits', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.76, intent: 'epf_transfer_attestation',
      reply: 'Infosys Central PF Trust has reviewed your Form 13. Digital signature attestation was completed on the EPFO Employer Portal today.'
    },
    {
      subject: 'InfyMe mobile app attendance punch geotag mismatch',
      description: 'Working from Electronic City Building 12, but InfyMe app attendance punch fails saying "Outside approved campus geofence".',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'infyme_geotag_error',
      reply: 'Please ensure location accuracy is set to High and calibrate device GPS near an open window. Campus Wi-Fi IP attendance mapping has also been refreshed.'
    },
    {
      subject: 'Onsite deputation H-1B visa documentation checklist',
      description: 'Selected for client deputation in Seattle starting January. What certified documents are required by immigration team?',
      category: 'careers', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'onsite_visa_documents',
      reply: 'Upload your degree certificates, consolidated mark sheets, prior employer experience letters, and updated CV on the Global Mobility Portal under Case REF-GM-2610-88.'
    },
    {
      subject: 'Cloud certification exam fee reimbursement (AWS Solutions Architect)',
      description: 'Passed AWS Certified Solutions Architect Associate exam yesterday. How do I claim the $150 exam fee reimbursement on Sparsh?',
      category: 'training', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'certification_reimbursement',
      reply: 'Navigate to Sparsh > Talent Development > Certification Reimbursement, upload your digital score report and payment invoice. Eligible certifications are reimbursed 100% in the next payroll.'
    },
    {
      subject: 'Background verification (BGV) education degree upload query',
      description: 'First Advantage BGV agency is requesting university provisional degree certificate for newly joined engineering graduate.',
      category: 'careers', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.77, intent: 'bgv_document_verification',
      reply: 'You can upload your DigiLocker verified digital degree certificate directly to the BGV candidate portal. This is accepted by First Advantage for clearance.'
    },
    {
      subject: 'Shift allowance discrepancy in October salary slip',
      description: 'Worked 14 night shifts in US timezone support project in September, but payroll reflects night shift allowance for only 8 shifts.',
      category: 'benefits', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.91, intent: 'shift_allowance_correction',
      reply: 'Project manager attendance roster had an unapproved leave tag for 6 dates. Shift roster has been corrected and balance allowance of ₹4,800 will be credited in supplementary payroll.'
    },
    {
      subject: 'Electronic City campus bus transport route 24 timing change',
      description: 'Requesting route 24 to depart Whitefield 15 minutes earlier to avoid Silk Board junction morning traffic congestion.',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'transport_route_timing',
      reply: 'Infosys Transport Operations has rescheduled Route 24 pickup to 7:15 AM starting Monday to ensure on-time campus arrival before 8:45 AM.'
    },
    {
      subject: 'Maternity leave extension policy guidelines and documentation',
      description: 'Current 26-week statutory maternity leave concludes in November. Requesting 8 weeks additional unpaid leave.',
      category: 'benefits', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'maternity_leave_extension',
      reply: 'As per Infosys Family Support Policy, up to 16 weeks of extended maternity leave or part-time work-from-home options are available with Business Unit HR approval.'
    },
    {
      subject: 'Vendor invoice payment status for campus cafeteria supplies',
      description: 'Submitted tax invoice INV-26-880 for bakery ingredients supplied to Food Court 3. Payment overdue by 15 days.',
      category: 'procurement', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.75, intent: 'vendor_invoice_payment',
      reply: 'Invoice approved by Central Facilities Management. Payment has been scheduled in the weekly accounts payable batch for Friday.'
    },
    {
      subject: 'Microsoft Authenticator MFA reset after new phone purchase',
      description: 'Migrated to new iPhone and lost Authenticator 2FA push notifications for corporate Outlook and Teams.',
      category: 'it_support', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'mfa_reset_request',
      reply: 'Temporary MFA bypass code has been sent to your registered personal mobile number. Log into https://aka.ms/mfasetup to scan the new QR code.'
    },
    {
      subject: 'Asset return checklist for resigned employee',
      description: 'Last working day is 31st October. Can I surrender my corporate laptop and ID badge at Pune DC instead of Bengaluru?',
      category: 'it_support', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'asset_return_process',
      reply: 'Yes, cross-location asset surrender is permitted at any Infosys Development Centre. Report to the IT Helpdesk at Pune Phase 2 DC for asset handover and clearance receipt.'
    },
    {
      subject: 'Relocation allowance reimbursement timeline after joining Pune DC',
      description: 'Submitted relocation freight and flight tickets on 5th October. When will the approved amount be credited?',
      category: 'benefits', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'relocation_reimbursement',
      reply: 'Your relocation expense claim of ₹35,000 has been verified by the Mobility Accounts Team and will credit with the October month-end payroll.'
    },
    {
      subject: 'Annual performance appraisal rating appeal escalation',
      description: 'Requesting review of annual appraisal rating for FY 2025-26 under the formal Grievance Redressal Committee guidelines.',
      category: 'careers', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.74, intent: 'appraisal_rating_appeal',
      reply: 'Your appraisal review request has been registered with the Delivery Unit Talent Committee. A discussion meeting with the Unit HR Head has been scheduled.'
    },
    {
      subject: 'Ergonomic mesh chair request for chronic back condition',
      description: 'Doctor has recommended ergonomic high-back lumbar support chair for long coding shifts at Bengaluru DC.',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'ergonomic_chair_request',
      reply: 'Ergonomic assessment has been approved by our Health & Safety team. Facilities will swap your standard desk chair with an ergonomic lumbar chair tomorrow.'
    },
    {
      subject: 'Visitor security pass generation for client audit at Gate 1',
      description: 'Client security auditors from Mastercard visiting Electronic City campus for PCI-DSS compliance inspection on Thursday.',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'visitor_pass_request',
      reply: 'Client visitor passes have been pre-approved on the VMS portal. Visitor badges will be ready for pickup at Gate 1 Reception upon government ID verification.'
    },
    {
      subject: 'Internal Job Postings (IJP) eligibility criteria for Band 5',
      description: 'Have completed 18 months in current banking project. Am I eligible to apply for Senior Cloud Architect roles under current IJP cycle?',
      category: 'careers', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'ijp_eligibility_criteria',
      reply: 'Employees with minimum 18 months tenure in their current role and an above-average performance rating in the last appraisal cycle are eligible to apply on the IJP portal.'
    },
    {
      subject: 'BitLocker recovery key request for locked laptop',
      description: 'Firmware update caused laptop to reboot into BitLocker blue prompt. Computer name is IN-BLR-D-44102.',
      category: 'it_support', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'bitlocker_recovery',
      reply: 'Your 48-digit BitLocker recovery key has been generated and sent to your registered secondary mobile number via secure SMS.'
    },
    {
      subject: 'Gratuity settlement calculation after 6 years of service',
      description: 'Completed 6 years and 4 months of continuous service at Infosys. What formula is used to calculate final gratuity payout?',
      category: 'benefits', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'gratuity_calculation_formula',
      reply: 'Gratuity is calculated as (15 × Last Drawn Basic Salary × Completed Years of Service) ÷ 26. For 6 years and 4 months, service tenure is rounded to 6 full years.'
    },
    {
      subject: 'Campus gym and sports facility membership activation',
      description: 'How do I activate access to the swimming pool and badminton courts at the Electronic City Multiplex building?',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'gym_facility_activation',
      reply: 'Campus sports and fitness facility access is complimentary for all employees. Sign the electronic health waiver on InfyMe > Campus Life > Sports to activate your badge.'
    },
    {
      subject: 'Lex learning portal course completion certificate not generating',
      description: 'Completed all 8 modules and final assessment for Generative AI on AWS course on Lex portal, but certificate is not appearing on profile.',
      category: 'training', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'lex_certificate_generation',
      reply: 'Lex course completions sync with the employee skills matrix overnight. Your verified course completion certificate is now generated and visible on your profile.'
    },
    {
      subject: 'Hardware upgrade: RAM expansion to 32GB for Docker containers',
      description: 'Running local Kubernetes and microservices for development requires upgrading current 16GB RAM to 32GB.',
      category: 'it_support', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.77, intent: 'ram_upgrade_request',
      reply: 'RAM upgrade request approved by Project Delivery Manager. Please book an appointment with IT Deskside Support in Building 4 to install the additional 16GB module.'
    },
    {
      subject: 'Sabbatical leave policy for higher studies abroad',
      description: 'Admitted to Master of Science program at Technical University of Munich. Can I apply for a 1-year educational sabbatical leave?',
      category: 'careers', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'educational_sabbatical_policy',
      reply: 'Employees with 3 or more years of continuous service can apply for Higher Education Sabbatical for up to 2 years with guaranteed re-employment upon course completion.'
    },
    {
      subject: 'Corporate credit card expense settlement approval pending',
      description: 'Submitted client dinner and taxi receipts for London business trip on Concur 3 weeks ago. Expense report pending audit approval.',
      category: 'benefits', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.76, intent: 'concur_expense_approval',
      reply: 'Receipt currency exchange rates have been verified. The expense report has been cleared by Central Finance and payment scheduled to your corporate card.'
    },
    {
      subject: 'Bangalore DC shuttle service between EC campus 1 and campus 2',
      description: 'What is the schedule of the internal buggy shuttle between Building 1 and Building 18 across the main roadway?',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'internal_campus_shuttle',
      reply: 'Internal electric buggies operate continuously between 8:00 AM and 8:30 PM with designated boarding shelters located outside Buildings 1, 6, 12, and 18.'
    },
    {
      subject: 'Procurement of ergonomic dual monitors for engineering team',
      description: 'Requesting bulk purchase of 24-inch IPS monitors for 12 software developers working on UI refactoring project.',
      category: 'procurement', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.74, intent: 'dual_monitor_procurement',
      reply: 'Hardware requisition PR-IT-2610-88 approved by Infrastructure Procurement. 12 Dell P2422H dual monitor sets are scheduled for delivery next Wednesday.'
    },
    {
      subject: 'Group Term Life Insurance nominee addition process',
      description: 'How do I add my newborn child as a secondary beneficiary for the corporate Group Term Life Insurance policy?',
      category: 'benefits', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'life_insurance_nominee',
      reply: 'Navigate to Sparsh > Benefits > Insurance > Nominee Update, fill in the beneficiary particulars and relationship details, and submit electronic sign-off.'
    },
    {
      subject: 'Outlook desktop client repeated password prompt bug',
      description: 'Microsoft Outlook 365 on corporate Windows 11 keeps prompting for credentials every 15 minutes despite checking remember password.',
      category: 'it_support', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'outlook_password_prompt_fix',
      reply: 'This is caused by stale Modern Authentication tokens in Windows Credential Manager. Clear MicrosoftOffice16 cached entries and restart Outlook.'
    },
    {
      subject: 'Paternity leave application submission through Sparsh portal',
      description: 'Blessed with a baby girl yesterday. How many days of paid paternity leave are provided and within what timeframe must it be availed?',
      category: 'benefits', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'paternity_leave_policy',
      reply: 'Infosys provides 10 working days of fully paid paternity leave which can be availed in up to two tranches within 6 months of child birth.'
    },
    {
      subject: 'Campus health centre doctor appointment booking',
      description: 'Need to consult general physician at Electronic City campus health clinic for acute viral fever and prescription.',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'campus_clinic_booking',
      reply: 'Campus health centers operate on a walk-in basis from 8:00 AM to 7:00 PM in Building 6. Medical emergencies are supported 24x7 with on-call physicians.'
    },
    {
      subject: 'Mandatory compliance training module completion deadline',
      description: 'Information Security and Prevention of Sexual Harassment (POSH) annual compliance courses deadline clarification.',
      category: 'training', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'compliance_training_deadline',
      reply: 'Mandatory annual compliance modules must be completed by 31st October to prevent automated network access restrictions.'
    },
    {
      subject: 'Wi-Fi connection error on corporate device in Building 11',
      description: 'Connecting to "Infosys-Secure" Wi-Fi network fails with 802.1x authentication error on 3rd floor.',
      category: 'it_support', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'wifi_8021x_auth_error',
      reply: 'Network certificate was renewed today. Please run the automatic Wi-Fi Profile Repair tool from the Software Center on your laptop.'
    },
    {
      subject: 'Vendor contract renewal for facility housekeeping services',
      description: 'Annual facility management contract for Mysore Campus Zone 3 expiring on 30th November. Requesting vendor evaluation timeline.',
      category: 'procurement', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.73, intent: 'housekeeping_contract_renewal',
      reply: 'Tender evaluation committee has shortlisted the top three vendors. Site audit and commercial negotiations will conclude by 10th November.'
    },
    {
      subject: 'Tax saving investment declaration Form 12BB deadline',
      description: 'What is the cutoff date for submitting provisional rent receipts and ELSS mutual fund statements for FY 2025-26?',
      category: 'benefits', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'form_12bb_tax_deadline',
      reply: 'Provisional tax declarations can be updated on Sparsh until 30th November. Actual investment proofs must be submitted between 1st and 20th January.'
    },
    {
      subject: 'Re-issue of lost employee smart ID card',
      description: 'Lost corporate RFID access card while travelling. How do I obtain a temporary badge and apply for duplicate card?',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'lost_id_card_process',
      reply: 'Collect a temporary badge from Security Gate 1 immediately. Apply for a duplicate smart card on Sparsh under Employee Services (nominal replacement fee ₹200 applies).'
    },
    {
      subject: 'Remote working allowance policy update for FY 2026',
      description: 'Does the hybrid work policy continue to provide monthly broadband and electricity reimbursement for remote developers?',
      category: 'benefits', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'remote_work_allowance',
      reply: 'Under the hybrid work model, developers approved for remote work receive a standard monthly digital connectivity allowance of ₹1,500 credited with payroll.'
    },
    {
      subject: 'GitHub Enterprise repository access permission request',
      description: 'Newly assigned to cloud modernization project. Need contributor read/write access to internal enterprise repository.',
      category: 'it_support', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'github_access_request',
      reply: 'Project manager has approved your access request. GitHub Enterprise organization invite has been dispatched to your corporate email.'
    },
    {
      subject: 'Project release confirmation letter for internal transfer',
      description: 'Selected for AI Centre of Excellence team. Need formal release clearance from current retail banking project.',
      category: 'careers', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'internal_project_release',
      reply: 'Your project release has been formalized in the Talent Management System with effective release date of 1st November.'
    },
    {
      subject: 'Creche facility enrollment on campus for infant',
      description: 'Inquiring about nursery and daycare admission eligibility and timings at Electronic City campus creche.',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'campus_creche_enrollment',
      reply: 'Campus creche operates in Building 8 from 8:30 AM to 6:30 PM for children aged 6 months to 6 years with certified pediatric caregivers.'
    },
    {
      subject: 'Notice period buy-out policy query for early release',
      description: 'Tendering resignation to join startup. Does Infosys policy permit notice period buyout for software engineers?',
      category: 'careers', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.74, intent: 'notice_period_buyout',
      reply: 'Notice period buyout is subject to business continuity approval by your Project Delivery Unit Head and satisfactory project knowledge transition.'
    },
    {
      subject: 'Software license request: JetBrains IntelliJ IDEA Ultimate',
      description: 'Developing Spring Boot microservices. Community edition lacks required enterprise profiling tools.',
      category: 'it_support', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'jetbrains_license_request',
      reply: 'JetBrains commercial license allocated under pool agreement. Activation key and license server URL have been sent to your email.'
    },
    {
      subject: 'Corporate SIM card international roaming activation',
      description: 'Travelling to Frankfurt client location for 10 days. Need international data roaming activated on company Airtel SIM.',
      category: 'it_support', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'sim_roaming_activation',
      reply: 'International roaming pack has been activated on your corporate mobile number effective 24 hours prior to scheduled departure.'
    },
    {
      subject: 'Cafeteria cashless food card balance recharge issue',
      description: 'Recharged Sodexo food card with Rs 2,000 via Net Banking. Amount debited from bank but food balance is unchanged.',
      category: 'campus', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'food_card_recharge_error',
      reply: 'Payment gateway reconciliation completed. The recharge amount of ₹2,000 has been credited to your active cafeteria meal card.'
    },
    {
      subject: 'Annual health checkup complimentary package coupon',
      description: 'How to book complimentary annual health screening package at Apollo Clinics under Infosys wellness benefit?',
      category: 'benefits', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'annual_health_checkup',
      reply: 'Generate your complimentary health checkup voucher on Sparsh > Wellness > Health Checkup and present it at any partner Apollo or Manipal diagnostic center.'
    },
    {
      subject: 'Higher education sponsorship under Infosys Foundation',
      description: 'Eligibility criteria for sponsorship towards Executive MBA at Indian Institute of Management (IIM) Bangalore.',
      category: 'training', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.76, intent: 'education_sponsorship',
      reply: 'Higher education sponsorship applications for top tier institutes open annually in November for Band 6 and above leaders.'
    },
    {
      subject: 'Headset replacement for call center voice agent',
      description: 'Microphone on Jabra USB headset crackles during customer support voice calls. Need replacement headset.',
      category: 'it_support', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'headset_replacement',
      reply: 'Replacement Jabra Evolve 40 stereo headset has been issued. You can collect it from the IT Hardware Store in Building 3.'
    },
    {
      subject: 'Workplace accommodation request for expectant mother',
      description: 'Requesting temporary workstation assignment on ground floor near elevator to avoid staircase climbing.',
      category: 'campus', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'workplace_accommodation',
      reply: 'Workstation re-allocation approved. A ground floor desk in Building 5 adjacent to the medical facility has been reserved for you.'
    }
  ],

  smartcc: [
    {
      subject: 'Webhook endpoint failing with 504 gateway timeout',
      description: 'Our customer CRM webhook receiver started timing out after 10 seconds during peak morning hours. Is there an exponential retry mechanism?',
      category: 'Technical', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.79, intent: 'webhook_timeout',
      reply: 'SmartCC webhooks automatically retry up to 5 times with exponential backoff. We recommend processing incoming webhook payloads asynchronously via a message queue.'
    },
    {
      subject: 'Meta WhatsApp Business API template rejected for utility category',
      description: 'Submitted shipping notification template with variables, but Meta rejected it stating category mismatch between marketing and utility.',
      category: 'Commerce & Trade', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'whatsapp_template_rejection',
      reply: 'Meta requires utility templates to strictly contain transactional order or shipping updates without promotional adjectives. Remove promotional lines to pass approval.'
    },
    {
      subject: 'Upgrade subscription from Growth to Enterprise 50-seats plan',
      description: 'Our support team is expanding from 15 to 50 customer service agents. What are the prorated billing terms for annual enterprise upgrade?',
      category: 'Billing', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'plan_upgrade_inquiry',
      reply: 'Your remaining Growth subscription balance will be credited prorated against the Enterprise plan. Enterprise includes custom SLAs, dedicated IP, and priority phone support.'
    },
    {
      subject: 'Annual GST tax invoice download with company GSTIN',
      description: 'Need B2B GST tax invoice for our annual SaaS subscription payment made on 1st October showing our 15-digit GSTIN.',
      category: 'Compliance & GST', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'gst_invoice_download',
      reply: 'Your tax invoice INV-26-8801 has been generated with your GSTIN and uploaded to the Billing portal under Invoices. Input Tax Credit (ITC) will reflect on GSTR-2B.'
    },
    {
      subject: 'AI bot Hindi auto-resolve accuracy tuning for banking vocabulary',
      description: 'Noticed that inquiries with Hindi banking terms like "खाता संख्या" or "किस्त" occasionally drop confidence below auto-resolve threshold.',
      category: 'Technical', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'hindi_bot_accuracy',
      reply: 'We have updated the multilingual vector embeddings for Indian banking terminology. Accuracy has improved to 96% on Devanagari prompts.'
    },
    {
      subject: 'SLA breach notification alert webhook to Slack channel failing',
      description: 'Configured incoming webhook URL for Slack channel #support-alerts, but test payload returns 404 channel not found.',
      category: 'Technical', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'slack_webhook_error',
      reply: 'The Slack webhook integration URL had expired. Re-authorizing the SmartCC Slack App and selecting the target channel resolved the issue.'
    },
    {
      subject: 'Analytics CSV export of conversation history hanging at 90%',
      description: 'Exporting 6-month ticket history containing 18,000 records hangs on the export modal and does not send download link email.',
      category: 'Technical', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.77, intent: 'analytics_export_hang',
      reply: 'Large exports exceeding 10,000 rows are now chunked into zip archives. Your export has been processed and download link sent to your registered email.'
    },
    {
      subject: 'Okta SAML Single Sign-On (SSO) configuration guide',
      description: 'Need the ACS URL and Entity ID to configure Okta enterprise SSO authentication for our 120 customer support representatives.',
      category: 'Account', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'okta_saml_configuration',
      reply: 'Your organization SAML ACS URL is https://app.smartcc.test/auth/saml/callback with Audience Entity ID "smartcc-enterprise-sso". SAML metadata XML is attached.'
    },
    {
      subject: 'Realtime SSE live updates disconnecting on iOS Safari',
      description: 'Mobile browser tab goes to background and Server-Sent Events connection closes without reconnecting upon foreground resume.',
      category: 'Technical', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.82, intent: 'sse_mobile_reconnect',
      reply: 'We have deployed heartbeat keep-alive pings every 25 seconds along with visibilitychange listener to auto-reconnect SSE on mobile browsers.'
    },
    {
      subject: 'Canned responses macro shortcuts not expanding in editor',
      description: 'Typing shortcode "!refund" in the reply composer does not open the canned macro dropdown list.',
      category: 'General', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'canned_response_macro',
      reply: 'Canned response triggering character in the v4 editor was updated to "/". Typing "/refund" instantly previews and inserts the response.'
    },
    {
      subject: 'Multi-tenant company routing setup for subsidiary brands',
      description: 'We run three retail brands. How do we configure separate brand inboxes, portals, and AI bots under our single tenant?',
      category: 'Account', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'multitenant_routing',
      reply: 'SmartCC v4 supports native multi-tenancy. Navigate to Settings > Inboxes to create dedicated channels for each subsidiary with custom branding and routing rules.'
    },
    {
      subject: 'Custom attributes not displaying in ticket right sidebar',
      description: 'Created custom attribute "Order Value" under settings, but it does not appear on conversation ticket details panel.',
      category: 'Technical', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'custom_attributes_display',
      reply: 'Custom attributes must be checked as "Display in Sidebar" in Settings > Custom Attributes. The attribute is now visible in the right panel.'
    },
    {
      subject: 'Voice agent microphone permission denied in Chrome browser',
      description: 'Clicking the voice agent mic button immediately throws NotAllowedError: Permission denied without showing browser prompt.',
      category: 'Technical', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'voice_mic_permission',
      reply: 'Chrome blocks mic permissions on HTTP sites. Ensure you are accessing via HTTPS or localhost, or reset site permissions in Chrome Settings > Site Settings > Microphone.'
    },
    {
      subject: 'CSAT survey completion rate low: popover widget configuration',
      description: 'Only 8% of customers complete post-resolution rating. Can we configure automatic CSAT trigger 1 hour after resolution?',
      category: 'General', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'csat_widget_config',
      reply: 'Yes, in Settings > CSAT Configuration you can set the survey display delay, customize the prompt text, and enable email survey fallbacks.'
    },
    {
      subject: 'Chatwoot agent assignment round-robin balance configuration',
      description: 'Inbound customer conversations are routing predominantly to the first two agents while other active agents receive no tickets.',
      category: 'Account', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'round_robin_assignment',
      reply: 'We have rebalanced the automatic assignment policy to Auto Assignment (Round Robin with Capacity Limits) to distribute tickets evenly across all online agents.'
    },
    {
      subject: 'Rate limit 429 Too Many Requests on REST API tickets endpoint',
      description: 'Our automated batch integration script hit HTTP 429 error when syncing historical tickets. What is the API rate limit ceiling?',
      category: 'Technical', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'api_rate_limits',
      reply: 'Default API rate limits are 120 requests/minute for Growth plans and 600 requests/minute for Enterprise plans. We have added your server IP to the whitelist.'
    },
    {
      subject: 'Storage quota warning for ticket attachments',
      description: 'Received notification that our 50GB media attachment storage is at 84% capacity. What happens if quota is exceeded?',
      category: 'Billing', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.78, intent: 'storage_quota_warning',
      reply: 'When storage reaches 100%, incoming attachments are temporarily queued. You can enable automatic storage auto-scaling in Billing > Add-ons.'
    },
    {
      subject: 'Dark mode contrast accessibility issue on message bubbles',
      description: 'Secondary text color in dark theme fails WCAG 2.1 AA contrast ratio against dark slate background.',
      category: 'Technical', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'dark_mode_contrast',
      reply: 'We updated CSS token --color-slate-11 to increase luminance contrast from 3.2:1 to 4.8:1, fully meeting WCAG AA accessibility standards.'
    },
    {
      subject: 'Two-factor authentication (2FA) enforcement for all agents',
      description: 'Security audit requires mandatory TOTP 2FA for all administrative and customer support agent accounts.',
      category: 'Compliance & GST', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'enforce_mfa_agents',
      reply: 'Admins can toggle "Enforce 2FA for All Agents" in Settings > Security. Agents will be prompted to register an authenticator app upon next sign-in.'
    },
    {
      subject: 'Audit logs export for SOC 2 Type II compliance review',
      description: 'Auditor requires tamper-evident audit log export of all agent logins, permission changes, and ticket exports for past 12 months.',
      category: 'Compliance & GST', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'soc2_audit_logs',
      reply: 'Cryptographically hashed audit log archive spanning your full reporting period is being compiled and will be delivered via secure SFTP.'
    },
    {
      subject: 'Credit card payment failed for monthly SaaS invoice',
      description: 'Credit card was declined with bank error code 51 (Insufficient Funds). Card has now been updated. How to re-try payment?',
      category: 'Billing', priority: 'critical', status: 'in_progress', tier: 'human', confidence: 0.85, intent: 'payment_retry_failure',
      reply: 'We have updated your billing method on file. Automated payment retry has been queued for immediate processing.'
    },
    {
      subject: 'Auto-responder vacation mode schedule configuration',
      description: 'How to configure automated out-of-office message for support team during national public holidays?',
      category: 'General', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'vacation_auto_responder',
      reply: 'Configure Business Hours under Settings > Inboxes > Business Hours, and activate "Off-Hours Automated Reply" with your custom holiday message.'
    },
    {
      subject: 'Custom email domain DKIM and SPF verification error',
      description: 'Added CNAME records for support@mybrand.com in Cloudflare DNS, but verification check displays "DKIM Record Missing".',
      category: 'Technical', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'dkim_spf_verification',
      reply: 'Cloudflare was proxying the CNAME records through its CDN proxy. Setting the DNS records to DNS Only (Grey Cloud) resolved verification.'
    },
    {
      subject: 'Bulk ticket status update to resolved via API',
      description: 'Can we batch update 200 stale tickets to resolved status using a single POST endpoint?',
      category: 'Technical', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'bulk_api_update',
      reply: 'Yes, use the PATCH /api/v1/tickets/bulk endpoint passing array of ticket IDs and payload { status: "resolved" }.'
    },
    {
      subject: 'Knowledge Base article search indexing latency',
      description: 'Published a new article on refund policies 30 minutes ago, but searching keywords does not return the article in widget.',
      category: 'Technical', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.93, intent: 'kb_indexing_latency',
      reply: 'Semantic vector re-indexing runs every 15 minutes. The vector embedding has been processed and your article is now actively indexed.'
    },
    {
      subject: 'WhatsApp incoming media attachments not rendering thumbnails',
      description: 'Customer sent PDF attachment via WhatsApp channel; thumbnail shows broken icon in agent conversation view.',
      category: 'Logistics & Orders', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.77, intent: 'whatsapp_media_render',
      reply: 'We fixed an issue with Meta graph API media token expiration. PDF document previews now generate thumbnails reliably.'
    },
    {
      subject: 'Zapier integration trigger not firing on ticket resolved',
      description: 'Zapier Zap configured to add row in Google Sheets when ticket is resolved stopped triggering yesterday.',
      category: 'Technical', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.92, intent: 'zapier_webhook_fix',
      reply: 'The Zapier webhook subscription had been paused due to an expired API key. Refreshing the Zapier connection restored active event delivery.'
    },
    {
      subject: 'Role-based access control (RBAC) custom agent permissions',
      description: 'Can we restrict tier-1 junior agents from deleting customer conversations or exporting contact lists?',
      category: 'Account', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'custom_role_permissions',
      reply: 'Enterprise tier supports Custom Agent Roles. Navigate to Settings > Custom Roles to disable export and delete permissions for junior agents.'
    },
    {
      subject: 'E-commerce order tracking webhook payload schema',
      description: 'What JSON attributes does SmartCC expect in incoming order tracking webhooks for automated order status resolution?',
      category: 'Commerce & Trade', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'order_webhook_schema',
      reply: 'The webhook schema expects { order_id, customer_email, tracking_number, carrier, status, estimated_delivery }. Documentation link provided.'
    },
    {
      subject: 'Dedicated IP address request for outbound email delivery',
      description: 'High volume transactional support emails experiencing occasional spam folder placement on Microsoft Outlook accounts.',
      category: 'Technical', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'dedicated_ip_request',
      reply: 'Dedicated sending IP 198.51.100.44 has been allocated and pre-warmed for your domain with neutral sender reputation score of 98.'
    },
    {
      subject: 'Chatwoot mobile app push notifications not received on Android',
      description: 'Support agents with Android 14 phones report missing push alerts for assigned incoming conversations.',
      category: 'Technical', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.81, intent: 'fcm_push_notification',
      reply: 'Google FCM credentials have been refreshed. Ensure Android battery optimization is set to "Unrestricted" for the Chatwoot mobile app.'
    },
    {
      subject: 'Refund request for unused seats after annual renewal',
      description: 'Renewed for 20 seats but downsized support department to 15 seats. Requesting refund for 5 unused seats.',
      category: 'Billing', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.76, intent: 'seat_downsize_refund',
      reply: 'Our billing team has processed a credit refund of $900 for the 5 unused licenses directly to your card statement.'
    },
    {
      subject: 'HIPAA business associate agreement (BAA) signing request',
      description: 'Healthcare telehealth customer requires signed BAA prior to routing patient support inquiries through SmartCC.',
      category: 'Compliance & GST', priority: 'high', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'hipaa_baa_signing',
      reply: 'SmartCC is SOC 2 and HIPAA compliant. Standard BAA document has been dispatched via DocuSign for mutual executive execution.'
    },
    {
      subject: 'Groq LLM API latency spike during morning peak hours',
      description: 'AI triage latency increased from 1.5s to 8s between 9:00 AM and 10:30 AM today.',
      category: 'Technical', priority: 'high', status: 'in_progress', tier: 'human', confidence: 0.80, intent: 'llm_latency_spike',
      reply: 'Groq infrastructure had an automated failover between cluster datacenters. Fallback to secondary inference endpoints has stabilized latency below 1.2s.'
    },
    {
      subject: 'Ticket conversation merge functionality inquiry',
      description: 'A customer sent 3 separate tickets about the same billing issue. How do agents merge them into a single thread?',
      category: 'General', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'merge_conversations',
      reply: 'Open the primary ticket, click the triple-dot actions menu in the conversation header, select "Merge Conversation", and choose the duplicate ticket.'
    },
    {
      subject: 'Multi-language chatbot fallback to English configuration',
      description: 'If a customer sends a query in Japanese or German, how to ensure the bot auto-translates and responds in English?',
      category: 'Technical', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'chatbot_fallback_language',
      reply: 'Configure Language Detection in Settings > AI Assistant > Fallback Behavior. Unrecognized foreign languages auto-translate to English with dual-language display.'
    },
    {
      subject: 'Agent collision detection alert when two agents view same ticket',
      description: 'How to prevent two support agents from composing replies simultaneously to the same customer ticket?',
      category: 'General', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'agent_collision_detection',
      reply: 'Collision detection is built-in. An animated avatar banner displays at the top of the composer showing when another agent is viewing or typing.'
    },
    {
      subject: 'Custom CSS branding injection in embedded customer widget',
      description: 'Can we inject custom fonts and primary brand hex colors into the embedded web widget on our marketing site?',
      category: 'Account', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'custom_widget_css',
      reply: 'Yes, define custom primaryColor, accentColor, and font-family in the widget embed script configuration options object.'
    },
    {
      subject: 'Automated canned message triggering on keyword match',
      description: 'Can we configure the bot to automatically dispatch the return shipping policy whenever the message contains "return label"?',
      category: 'General', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'keyword_auto_response',
      reply: 'Navigate to Settings > Automation Rules > Add Rule, set event to "Message Created" with condition "Message Body Contains return label", action "Send Canned Response".'
    },
    {
      subject: 'Bank account wire transfer payment details for Europe invoice',
      description: 'Our European finance department processes payments via SEPA/IBAN wire transfer instead of credit card.',
      category: 'Billing', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'sepa_wire_payment_details',
      reply: 'European SEPA and IBAN payment remittance instructions with SWIFT/BIC code have been emailed along with your commercial proforma invoice.'
    },
    {
      subject: 'Ticket assignment rule based on customer VIP attribute',
      description: 'Want all tickets from customers with custom attribute "Tier = Enterprise" to route to Senior Support Engineers.',
      category: 'Account', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'vip_assignment_rule',
      reply: 'In Settings > Automation Rules, create rule with condition "Contact Attribute: Tier Equals Enterprise", action "Assign Team: Senior Support Engineering".'
    },
    {
      subject: 'Session inactivity timeout configuration for agents',
      description: 'Need to configure automatic agent session logout after 30 minutes of keyboard/mouse inactivity for security compliance.',
      category: 'Compliance & GST', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'session_timeout_setting',
      reply: 'Admins can configure Session Inactivity Timeout under Settings > Security Settings > Idle Session Timeout (set to 30 minutes).'
    },
    {
      subject: 'Webhook signature HMAC SHA-256 verification code snippet',
      description: 'Requesting Python code example for verifying the X-SmartCC-Signature header on incoming webhook requests.',
      category: 'Technical', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'webhook_signature_code',
      reply: 'Python verification snippet using hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest() provided in technical documentation.'
    },
    {
      subject: 'WhatsApp template header image upload dimension limits',
      description: 'What are the recommended aspect ratio and maximum file size for image headers in WhatsApp broadcast templates?',
      category: 'Commerce & Trade', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.97, intent: 'whatsapp_image_specs',
      reply: 'Recommended dimensions are 16:9 or 1.91:1 ratio (1200 x 628 pixels) with maximum file size of 5 MB in JPEG or PNG format.'
    },
    {
      subject: 'Bulk customer contacts import from Salesforce CSV',
      description: 'Importing 5,000 corporate contacts from Salesforce CRM export. What is the required CSV column mapping?',
      category: 'Logistics & Orders', priority: 'medium', status: 'resolved', tier: 'auto', confidence: 0.94, intent: 'salesforce_contact_import',
      reply: 'Use the Contacts > Import Contacts wizard. Map name, email, phone_number, company_name, and custom attributes directly from your CSV header.'
    },
    {
      subject: 'Email threading issue with Microsoft Outlook inline replies',
      description: 'When Outlook users reply to ticket notifications, old email signatures sometimes append as duplicate customer messages.',
      category: 'Technical', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.78, intent: 'email_thread_sanitization',
      reply: 'Our email parsing pipeline has updated the regex signature stripper to discard Microsoft Outlook "From: / Sent:" thread headers cleanly.'
    },
    {
      subject: 'Agent performance KPI report generation for quarterly review',
      description: 'Need report detailing First Response Time (FRT), Average Resolution Time, and CSAT scores by agent for Q3.',
      category: 'General', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.96, intent: 'agent_kpi_reports',
      reply: 'Generate the Agent Performance Report under Reports > Agent Reports, select date range Q3, and click Export CSV for detailed breakdown.'
    },
    {
      subject: 'Disabling customer satisfaction survey for internal test tickets',
      description: 'How to exclude internal test tickets created by QA team from triggering CSAT feedback surveys?',
      category: 'General', priority: 'low', status: 'resolved', tier: 'auto', confidence: 0.95, intent: 'exclude_csat_rule',
      reply: 'Add tag "internal-test" to the ticket. In CSAT Settings, set exclusion condition "Do not send CSAT when conversation has tag internal-test".'
    },
    {
      subject: 'Custom domain SSL certificate auto-renewal failure',
      description: 'Let’s Encrypt auto-renewal failed for custom domain help.mybrand.com. Certificate expires in 48 hours.',
      category: 'Technical', priority: 'critical', status: 'resolved', tier: 'auto', confidence: 0.98, intent: 'ssl_certificate_renewal',
      reply: 'ACME HTTP-01 challenge was failing due to a CAA DNS record restriction. The challenge succeeded and SSL certificate is renewed for 90 days.'
    },
    {
      subject: 'Data retention policy: automatic deletion of tickets older than 2 years',
      description: 'GDPR compliance requires automated purging of closed customer support conversations older than 730 days.',
      category: 'Compliance & GST', priority: 'medium', status: 'in_progress', tier: 'human', confidence: 0.82, intent: 'gdpr_data_retention',
      reply: 'Automated GDPR retention scheduler has been configured in Settings > Compliance to purge conversation records and attachments after 24 months.'
    }
  ]
};
