"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "kh";

interface Translations {
  [key: string]: {
    en: string;
    kh: string;
  };
}

const translations: Translations = {
  // Navbar
  lookup: { en: "Lookup", kh: "ស្វែងរកលេខ" },
  reportScam: { en: "Report Scam", kh: "រាយការណ៍លេខឆបោក" },
  statistics: { en: "Statistics", kh: "ស្ថិតិ" },
  liveReports: { en: "Live Reports", kh: "របាយការណ៍បច្ចុប្បន្ន" },
  adminPanel: { en: "Admin Panel", kh: "ផ្ទាំងគ្រប់គ្រង" },
  login: { en: "Login", kh: "ចូលគណនី" },
  register: { en: "Register", kh: "ចុះឈ្មោះ" },
  logout: { en: "Logout", kh: "ចាកចេញ" },

  // Hero
  heroTagline: { en: "Stop Caller Scams in Cambodia", kh: "រួមគ្នាទប់ស្កាត់ការឆបោកតាមទូរស័ព្ទនៅកម្ពុជា" },
  heroTitle1: { en: "Verify Suspicious Calls with", kh: "ផ្ទៀងផ្ទាត់លេខទូរស័ព្ទសង្ស័យជាមួយ" },
  heroSubtitle: { en: "Search phone numbers to instantly check their reputation score, identify country codes, and read community fraud reports.", kh: "ស្វែងរកលេខទូរស័ព្ទដើម្បីពិនិត្យពិន្ទុហានិភ័យ ប្រភពប្រទេស និងអានរបាយការណ៍ឆបោកពីសហគមន៍ភ្លាមៗ។" },
  searchPlaceholder: { en: "Enter phone number (e.g. +85512345678)...", kh: "បញ្ចូលលេខទូរស័ព្ទ (ឧ. +85512345678, 099888777)..." },
  scanButton: { en: "Scan Number", kh: "ពិនិត្យលេខ" },

  // Stats cards
  totalScamNumbers: { en: "Total Scam Numbers", kh: "ចំនួនលេខឆបោកសរុប" },
  newReportsToday: { en: "New Reports Today", kh: "របាយការណ៍ថ្មីថ្ងៃនេះ" },
  activeReporters: { en: "Active Reporters", kh: "សមាជិកសកម្ម" },

  // How Protections Work
  howProtectsTitle: { en: "How ScamShield Protects You", kh: "តើ ScamShield ការពារអ្នកដោយរបៀបណា?" },
  howProtectsDesc: { en: "An algorithm-driven system powered by community report velocity, country analysis, and risk scoring.", kh: "ប្រព័ន្ធវិភាគដោយផ្អែកលើភាពញឹកញាប់នៃរបាយការណ៍សហគមន៍ ការវិភាគលេខប្រទេស និងការវាយតម្លៃពិន្ទុហានិភ័យ។" },
  step1Title: { en: "1. Search & Query", kh: "១. ស្វែងរក និងឆែកមើល" },
  step1Desc: { en: "Enter any suspicious caller ID. Our database performs instant string sanitation and extracts prefixes.", kh: "បញ្ចូលលេខទូរស័ព្ទដែលសង្ស័យ។ ប្រព័ន្ធរបស់យើងនឹងសម្អាត និងទាញយកកូដប្រទេស ឬប្រព័ន្ធទូរស័ព្ទភ្លាមៗ។" },
  step2Title: { en: "2. Risk Assessment", kh: "២. ការវាយតម្លៃហានិភ័យ" },
  step2Desc: { en: "The risk scoring engine analyzes reports, velocity, country code classifications, and distinct user reviews.", kh: "ម៉ាស៊ីនគណនាពិន្ទុហានិភ័យវិភាគលើរបាយការណ៍ ភាពញឹកញាប់ កូដប្រទេស និងការវាយតម្លៃពីអ្នកប្រើប្រាស់ផ្សេងៗគ្នា។" },
  step3Title: { en: "3. Secure Outcome", kh: "៣. លទ្ធផលសុវត្ថិភាព" },
  step3Desc: { en: "Get a detailed safety badge. Report spam numbers to immediately alert the entire community in real-time.", kh: "ទទួលបានផ្លាកសញ្ញាសុវត្ថិភាពលម្អិត។ រាយការណ៍លេខឆបោកដើម្បីព្រមានសហគមន៍ទាំងមូលក្នុងពេលជាក់ស្តែង។" },

  // Common Scam Categories
  commonCategoriesTitle: { en: "Common Scam Categories", kh: "ប្រភេទនៃការឆបោកទូទៅ" },
  commonCategoriesDesc: { en: "Scam tactics used by automated robocalls, spoofers, and bad actors in Cambodia.", kh: "ល្បិចបោកប្រាស់ដែលប្រើប្រាស់ដោយការខលស្វ័យប្រវត្ត លេខក្លែងបន្លំ និងជនខិលខូចនៅកម្ពុជា។" },

  // Scam Categories values
  BANK_FRAUD: { en: "Bank Fraud", kh: "ការបោកប្រាស់តាមធនាគារ" },
  FAKE_DELIVERY: { en: "Fake Delivery", kh: "ការបន្លំសេវាដឹកជញ្ជូន" },
  INVESTMENT: { en: "Investment Scams", kh: "ការបោកប្រាស់វិនិយោគ" },
  LOTTERY: { en: "Lottery Scams", kh: "ការបោកប្រាស់ឈ្នះរង្វាន់" },
  GOVERNMENT: { en: "Government Impersonation", kh: "ការបន្លំខ្លួនជាសមត្ថកិច្ច" },
  ROMANCE: { en: "Romance Scams", kh: "ការបោកប្រាស់មនោសញ្ចេតនា" },
  TECH_SUPPORT: { en: "Tech Support Scams", kh: "ការបោកប្រាស់ផ្នែកបច្ចេកវិទ្យា" },
  OTHER: { en: "Other Scams", kh: "ការបោកប្រាស់ផ្សេងៗ" },

  // Scam Categories description values
  BANK_FRAUD_desc: { en: "Phishing links, OTP theft, fake ABA notifications", kh: "តំណភ្ជាប់បោកប្រាស់ (Phishing) ការលួចលេខកូដ OTP និងការបន្លំសារជូនដំណឹង ABA/ធនាគារ" },
  FAKE_DELIVERY_desc: { en: "Fake agents requesting prepayment for parcels", kh: "ភ្នាក់ងារក្លែងបន្លំទាមទារឱ្យបង់ប្រាក់មុនសម្រាប់អីវ៉ាន់ផ្ញើមកពីក្រៅប្រទេស" },
  INVESTMENT_desc: { en: "Get-rich-quick cryptocurrency and stock scams", kh: "ការបោកប្រាស់ទាក់ទាញឱ្យវិនិយោគភាគហ៊ុន ឬលុយគ្រីបតូដែលសន្យាបានផលលឿន" },
  LOTTERY_desc: { en: "SMS alerts saying you won a cash reward", kh: "សារ SMS ឬការខលប្រកាសថាអ្នកបានឈ្នះរង្វាន់ទឹកប្រាក់ ឬឡានម៉ូតូ" },
  GOVERNMENT_desc: { en: "Scammers claiming to be tax or law officials", kh: "ជនបោកប្រាស់បន្លំខ្លួនជាមន្ត្រីពន្ធដារ នគរបាល ឬតុលាការ ដើម្បីគំរាមកំហែង" },
  ROMANCE_desc: { en: "Fake profiles asking for money for emergencies", kh: "គណនីក្លែងក្លាយបង្កើតស្នេហាតាមអនឡាញ រួចសុំលុយដោះស្រាយបញ្ហាបន្ទាន់" },
  TECH_SUPPORT_desc: { en: "Fake technicians claiming device issues or hacking", kh: "ភ្នាក់ងារបច្ចេកទេសក្លែងក្លាយប្រកាសថាឧបករណ៍មានបញ្ហា ឬត្រូវបានលួចចូល" },
  OTHER_desc: { en: "Miscellaneous fraudulent schemes and activities", kh: "ល្បិចកលបោកប្រាស់ទម្រង់ផ្សេងៗទៀត" },

  // Recent activity logs
  recentActivityTitle: { en: "Recent Activity Log", kh: "កំណត់ត្រាសកម្មភាពថ្មីៗ" },
  recentActivityDesc: { en: "The latest suspicious caller reports filed by community members.", kh: "របាយការណ៍ថ្មីៗបំផុតអំពីលេខទូរស័ព្ទសង្ស័យដែលបានដាក់ស្នើដោយសមាជិកសហគមន៍។" },
  byReporter: { en: "By: ", kh: "ដោយ៖ " },
  noDescription: { en: "No description provided.", kh: "មិនមានការរៀបរាប់លម្អិតទេ។" },

  // FAQs
  faqsTitle: { en: "Frequently Asked Questions", kh: "សំណួរដែលសួរញឹកញាប់" },
  faq1Q: { en: "Is ScamShield affiliated with the government?", kh: "តើ ScamShield ជាប់ពាក់ព័ន្ធជាមួយរាជរដ្ឋាភិបាលដែរឬទេ?" },
  faq1A: { en: "No, ScamShield is a community-driven database created for public transparency. While we encourage cross-referencing with the Telecom Regulator of Cambodia (TRC), our database is updated directly by community members.", kh: "ទេ! ScamShield គឺជាប្រព័ន្ធទិន្នន័យបង្កើតឡើងដោយសហគមន៍ ដើម្បីតម្លាភាពសាធារណៈ។ ទោះជាយើងលើកទឹកចិត្តឱ្យផ្ទៀងផ្ទាត់ជាមួយនិយតករទូរគមនាគមន៍កម្ពុជា (TRC) ក៏ដោយ ក៏ទិន្នន័យរបស់យើងត្រូវបានធ្វើបច្ចុប្បន្នភាពផ្ទាល់ពីអ្នកប្រើប្រាស់។" },
  faq2Q: { en: "How is the risk score calculated?", kh: "តើពិន្ទុហានិភ័យត្រូវបានគណនាដោយរបៀបណា?" },
  faq2A: { en: "Risk scores range from 0 (Safe) to 100 (High Risk Scam). Our engine computes scores based on the total report quantity, reporting velocity (frequency over a short duration), geographical country source codes, and user reviewer diversity.", kh: "ពិន្ទុហានិភ័យមានចាប់ពី ០ (សុវត្ថិភាព) ដល់ ១០០ (ហានិភ័យខ្ពស់)។ ម៉ាស៊ីនរបស់យើងគណនាដោយផ្អែកលើចំនួនរបាយការណ៍សរុប ភាពញឹកញាប់នៃការរាយការណ៍ កូដប្រទេស និងភាពសម្បូរបែបរបស់អ្នករាយការណ៍។" },
  faq3Q: { en: "Can I request a number removal if it was marked in error?", kh: "តើខ្ញុំអាចស្នើសុំលុបលេខទូរស័ព្ទចេញវិញបានទេ ប្រសិនបើមានការយល់ច្រឡំ?" },
  faq3A: { en: "Yes. If your legitimate number was reported maliciously, please report details to support. Administrators review flags in the Admin Moderation panel and remove erroneous submissions.", kh: "បាទ/ចាសបាន។ ប្រសិនបើលេខទូរស័ព្ទស្របច្បាប់របស់អ្នកត្រូវបានរាយការណ៍ដោយចេតនាអាក្រក់ សូមទាក់ទងមកក្រុមការងារគាំទ្រ។ អភិបាលប្រព័ន្ធ (Admin) នឹងពិនិត្យឡើងវិញតាមរយៈផ្ទាំងគ្រប់គ្រង និងលុបចេញបើរកឃើញថាខុសឆ្គង។" },

  // Search details
  backToHome: { en: "Back to Home", kh: "ត្រឡប់ទៅទំព័រដើម" },
  searchAnotherPlaceholder: { en: "Search another number...", kh: "ស្វែងរកលេខទូរស័ព្ទផ្សេងទៀត..." },
  scanBtn: { en: "Scan", kh: "ពិនិត្យមើល" },
  loadingReputation: { en: "Analyzing caller reputation database...", kh: "កំពុងវិភាគទិន្នន័យលេខទូរស័ព្ទ..." },
  analysisFailed: { en: "Analysis Failed", kh: "ការវិភាគបានបរាជ័យ" },
  scanAPhone: { en: "Scan a Phone Number", kh: "ពិនិត្យលេខទូរស័ព្ទ" },
  scanAPhoneDesc: { en: "Input a phone number above to query ScamShield's reputation algorithms.", kh: "បញ្ចូលលេខទូរស័ព្ទខាងលើដើម្បីសាកសួរតាមប្រព័ន្ធស្វែងរករបស់ ScamShield។" },
  scannedId: { en: "Scanned Caller ID", kh: "លេខទូរស័ព្ទដែលបានពិនិត្យ" },
  riskIndex: { en: "Risk Index", kh: "សន្ទស្សន៍ហានិភ័យ" },
  country: { en: "Country", kh: "ប្រទេស" },
  countryCode: { en: "Country Code", kh: "កូដប្រទេស" },
  carrier: { en: "Carrier Operator", kh: "ប្រព័ន្ធសេវាទូរស័ព្ទ" },
  regionProvince: { en: "Region / Province", kh: "តំបន់ / ខេត្ត-ក្រុង" },
  activeReportsCount: { en: "Active Reports", kh: "របាយការណ៍សរុប" },
  recentVelocity: { en: "Recent Velocity", kh: "របាយការណ៍សប្តាហ៍នេះ" },
  timelineTitle: { en: "Community Reports Feed", kh: "កំណត់ត្រារបាយការណ៍ពីសហគមន៍" },
  cleanRecordTitle: { en: "Clean Record", kh: "មិនទាន់មានប្រវត្តិឆបោក" },
  cleanRecordDesc: { en: "No community flags have been filed for this number. If you suspect fraud, use the Report button to flag it.", kh: "មិនទាន់មានការរាយការណ៍អំពីលេខនេះទេ។ ប្រសិនបើអ្នកសង្ស័យ សូមចុចប៊ូតុងរាយការណ៍ខាងក្រោម។" },
  recognizeTitle: { en: "Do you recognize this caller?", kh: "តើអ្នកស្គាល់អ្នកខលមកនេះទេ?" },
  recognizeDesc: { en: "If this number made scam claims or fake promises, report it immediately to protect others.", kh: "ប្រសិនបើលេខនេះខលមកបោកប្រាស់ ឬទាមទារប្រាក់ សូមរាយការណ៍ភ្លាមៗដើម្បីការពារអ្នកដទៃ។" },
  reportNumberButton: { en: "Report Number", kh: "រាយការណ៍លេខនេះ" },
  categoryLabel: { en: "Category: ", kh: "ប្រភេទ៖ " },
  incidentLocation: { en: "Incident Location: ", kh: "ទីតាំងកើតហេតុ៖ " },
  loadingSearchContext: { en: "Loading Search Context...", kh: "កំពុងទាញយកទិន្នន័យស្វែងរក..." },

  // Risk levels
  safeNumber: { en: "Safe Number", kh: "លេខមានសុវត្ថិភាព" },
  safeNumberDesc: { en: "This number has no reported malicious activity and is safe to answer.", kh: "លេខនេះមិនទាន់មានការរាយការណ៍អំពីសកម្មភាពឆបោកណាមួយឡើយ និងមានសុវត្ថិភាពក្នុងការទទួលទូរស័ព្ទ។" },
  suspicious: { en: "Suspicious", kh: "សង្ស័យ" },
  suspiciousDesc: { en: "Caution: This number has been flagged by users recently. Proceed with caution.", kh: "ប្រុងប្រយ័ត្ន៖ លេខនេះត្រូវបានរាយការណ៍ដោយអ្នកប្រើប្រាស់ថ្មីៗនេះ។ សូមប្រុងប្រយ័ត្នមុននឹងសន្ទនា។" },
  highRiskScam: { en: "High Risk Scam", kh: "លេខឆបោកគ្រោះថ្នាក់ខ្លាំង" },
  highRiskScamDesc: { en: "Critical warning: Multiple verified scam reports are associated with this number. Do not share financial or personal details.", kh: "ការព្រមានបន្ទាន់៖ មានរបាយការណ៍ឆបោកដែលបានផ្ទៀងផ្ទាត់ជាច្រើនទាក់ទងនឹងលេខនេះ។ ដាច់ខាតកុំផ្តល់ព័ត៌មានហិរញ្ញវត្ថុ ឬផ្ទាល់ខ្លួនឱ្យសោះ។" },
  scoreLabel: { en: "Score: ", kh: "ពិន្ទុ៖ " },

  // Report form
  reportTitle: { en: "Report Scam Caller", kh: "រាយការណ៍លេខទូរស័ព្ទឆបោក" },
  reportSub: { en: "Provide caller details to flag fraud and warn the community.", kh: "សូមផ្តល់ព័ត៌មានលម្អិតដើម្បីវាយតម្លៃ និងព្រមានដល់សហគមន៍ទាំងមូល។" },
  authRequired: { en: "Authentication Required", kh: "តម្រូវឱ្យចូលគណនី" },
  authRequiredDesc: { en: "To prevent spam and ensure reporting integrity, you must be logged in to report scam callers.", kh: "ដើម្បីការពារការរាយការណ៍ឥតប្រយោជន៍ និងរក្សាតម្លាភាព អ្នកត្រូវតែចូលគណនីជាមុនសិន ទើបអាចរាយការណ៍លេខទូរស័ព្ទបាន។" },
  signInToReport: { en: "Sign In to Report", kh: "ចូលគណនីដើម្បីរាយការណ៍" },
  phoneRequired: { en: "Phone number is required", kh: "សូមបញ្ចូលលេខទូរស័ព្ទ" },
  submittingReport: { en: "Filing report...", kh: "កំពុងដាក់ស្នើរបាយការណ៍..." },
  reportSuccess: { en: "Report submitted successfully! Redirecting...", kh: "របាយការណ៍ត្រូវបានដាក់ស្នើដោយជោគជ័យ! កំពុងប្តូរទំព័រ..." },
  scamPhone: { en: "Scam Phone Number", kh: "លេខទូរស័ព្ទបោកប្រាស់" },
  scamCategory: { en: "Scam Category", kh: "ប្រភេទនៃការឆបោក" },
  fraudDesc: { en: "Fraud Description", kh: "រៀបរាប់អំពីការបោកប្រាស់" },
  fraudDescPlaceholder: { en: "Detail what the caller said, bank name spoofed, prize claimed, or steps they asked you to take...", kh: "សូមរៀបរាប់ពីអ្វីដែលជនបោកប្រាស់បាននិយាយ ឈ្មោះធនាគារដែលគេក្លែងបន្លំ ឬរង្វាន់ដែលគេសន្យាឱ្យ..." },
  submitReportButton: { en: "Submit Report", kh: "ដាក់ស្នើរបាយការណ៍" },
  provinceLabel: { en: "Province / City", kh: "ខេត្ត / រាជធានី" },
  districtLabel: { en: "District / Khan", kh: "ស្រុក / ខណ្ឌ" },
  communeLabel: { en: "Commune / Sangkat", kh: "ឃុំ / សង្កាត់" },
  villageLabel: { en: "Village / Phum", kh: "ភូមិ / ភូមិ" },
  phonePlaceholder: { en: "e.g. +85599222333 or 012345678", kh: "ឧ. +85599222333 ឬ 012345678" },
  locationPlaceholderPhnomPenh: { en: "e.g. Phnom Penh", kh: "ឧ. ភ្នំពេញ" },
  locationPlaceholderChamkarMon: { en: "e.g. Chamkar Mon", kh: "ឧ. ចំការមន" },
  locationPlaceholderTonleBassac: { en: "e.g. Tonle Bassac", kh: "ឧ. ទន្លេបាសាក់" },
  locationPlaceholderPhum1: { en: "e.g. Phum 1", kh: "ឧ. ភូមិ ១" },
  operatorLabel: { en: "Detected Carrier", kh: "ប្រព័ន្ធសេវាទូរស័ព្ទ" },
  locationGroupTitle: { en: "Occurrence Location (Optional)", kh: "ទីតាំងកើតហេតុ (មិនបង្ខំ)" },
  howToReportTitle: { en: "Reporting Guidelines", kh: "លក្ខខណ្ឌណែនាំក្នុងការរាយការណ៍" },
  howToReport1: { en: "Ensure the phone number is typed correctly to prevent false flags.", kh: "សូមប្រាកដថាលេខទូរស័ព្ទត្រូវបានវាយបញ្ចូលត្រឹមត្រូវ ដើម្បីការពារការរាយការណ៍ខុស។" },
  howToReport2: { en: "Provide specific details like names, spoofed banks, or reward claims.", kh: "សូមផ្តល់ព័ត៌មានលម្អិតជាក់លាក់ ដូចជាឈ្មោះ ធនាគារដែលគេបន្លំ ឬរង្វាន់ដែលគេសន្យា។" },
  howToReport3: { en: "All submissions are processed in real-time to alert the community.", kh: "រាល់ការដាក់ស្នើនឹងត្រូវដំណើរការភ្លាមៗដើម្បីព្រមានដល់សហគមន៍ទាំងមូល។" },
  liveStatsSummary: { en: "ScamShield Registry Metrics", kh: "ស្ថិតិនៃបញ្ជីទិន្នន័យ ScamShield" },
  activeProtections: { en: "Active Community Shield", kh: "ខែលការពារសហគមន៍សកម្ម" },
  unknownCarrier: { en: "Unknown Operator", kh: "មិនស្គាល់ប្រព័ន្ធសេវា" },

  // Community / Live feed
  liveTelemetryTitle: { en: "Live Telemetry Feed", kh: "កំណត់ត្រារបាយការណ៍ផ្សាយផ្ទាល់" },
  liveTelemetryDesc: { en: "Real-time feed of scam reports submitted by users across Cambodia. Real-time updates connect via WebSockets.", kh: "របាយការណ៍អំពីការឆបោកក្នុងពេលជាក់ស្តែងដែលដាក់ស្នើដោយអ្នកប្រើប្រាស់នៅកម្ពុជា ភ្ជាប់តាមរយៈ WebSockets។" },
  connectingLive: { en: "Connecting to live feed stream...", kh: "កំពុងភ្ជាប់ទៅកាន់ការផ្សាយផ្ទាល់..." },
  timelineStream: { en: "Timeline Stream", kh: "ខ្សែបន្ទាត់ពេលវេលា" },
  liveConnecting: { en: "Live Connecting", kh: "កំពុងភ្ជាប់ផ្ទាល់" },
  noScamLogs: { en: "No scam logs found. Be the first to report caller activities!", kh: "មិនទាន់មានកំណត់ត្រាឆបោកទេ។ សូមក្លាយជាអ្នកដំបូងគេក្នុងការរាយការណ៍លេខសង្ស័យ!" },
  reportedBy: { en: "Reported by: ", kh: "រាយការណ៍ដោយ៖ " },
  riskLevelLabel: { en: "Risk Level", kh: "កម្រិតហានិភ័យ" },
  criticalStatus: { en: "Critical", kh: "គ្រោះថ្នាក់ខ្លាំង" },
  suspiciousStatus: { en: "Suspicious", kh: "សង្ស័យ" },
  safeStatus: { en: "Safe", kh: "សុវត្ថិភាព" },
  highRiskDetected: { en: "High Risk Number Detected", kh: "រកឃើញលេខហានិភ័យខ្ពស់" },
  flaggedFor: { en: "Flagged for ", kh: "រាយការណ៍ចំពោះ៖ " },
  riskIndexReached: { en: ". Risk index reached ", kh: "។ ពិន្ទុហានិភ័យឡើងដល់ " },

  // Statistics
  metricsTitle: { en: "Metrics & Telemetry", kh: "ស្ថិតិ និងទិន្នន័យវាស់វែង" },
  metricsDesc: { en: "Explore mathematical reporting trends, scam category volumes, and caller reputations in Cambodia.", kh: "ស្វែងយល់អំពីនិន្នាការនៃការរាយការណ៍ ទំហំនៃការឆបោកតាមប្រភេទនីមួយៗ និងកេរ្តិ៍ឈ្មោះលេខទូរស័ព្ទនៅកម្ពុជា។" },
  aggregatingTelemetry: { en: "Aggregating telemetry databases...", kh: "កំពុងប្រមូលផ្តុំទិន្នន័យស្ថិតិ..." },
  reportingVelocityTitle: { en: "Reporting Velocity (2026)", kh: "ល្បឿននៃការរាយការណ៍ (២០២៦)" },
  reportingVelocityDesc: { en: "This graph captures monthly scam submissions compiled by user registrations. The summer shows higher velocities.", kh: "ក្រាហ្វនេះបង្ហាញពីការរាយការណ៍ឆបោកប្រចាំខែដែលប្រមូលបានពីសមាជិក។ រដូវក្តៅបង្ហាញពីល្បឿនខ្ពស់ជាង។" },
  scamMethodVolumes: { en: "Scam Method Volumes", kh: "ទំហំនៃការឆបោកតាមវិធីសាស្ត្រនីមួយៗ" },
  noCategoriesLoaded: { en: "No categories loaded.", kh: "មិនទាន់មានព័ត៌មានប្រភេទឆបោកត្រូវបានដាក់ចូលឡើយ។" },
  highDensityThreatLog: { en: "High-Density Threat Log (Top 5)", kh: "កំណត់ត្រាការគំរាមកំហែងខ្ពស់បំផុត (កំពូលទាំង៥)" },
  tablePhoneId: { en: "Phone Caller ID", kh: "លេខទូរស័ព្ទ" },
  tableTotalReports: { en: "Total Reports", kh: "ចំនួនរាយការណ៍សរុប" },
  tableRiskScore: { en: "Risk score", kh: "ពិន្ទុហានិភ័យ" },
  tableClassification: { en: "Classification", kh: "ការវាយតម្លៃ" },
  highRiskThreatBadge: { en: "High Risk Threat", kh: "ការគំរាមកំហែងខ្ពស់" },
  noThreatItems: { en: "No threat items cataloged.", kh: "មិនមានទិន្នន័យការគំរាមកំហែងណាមួយឡើយ។" },

  // Login & Register
  welcomeBack: { en: "Welcome Back", kh: "សូមស្វាគមន៍ត្រឡប់មកវិញ" },
  signInDesc: { en: "Sign in to search, report numbers, and protect your community.", kh: "ចូលគណនីដើម្បីស្វែងរក រាយការណ៍លេខទូរស័ព្ទ និងការពារសហគមន៍របស់អ្នក។" },
  emailLabel: { en: "Email Address", kh: "អាសយដ្ឋានអ៊ីមែល" },
  passwordLabel: { en: "Password", kh: "លេខសម្ងាត់" },
  signInBtn: { en: "Sign In", kh: "ចូលគណនី" },
  authenticating: { en: "Authenticating...", kh: "កំពុងផ្ទៀងផ្ទាត់..." },
  noAccount: { en: "Don't have an account?", kh: "មិនទាន់មានគណនីមែនទេ?" },
  createAccountLink: { en: "Create an account", kh: "ចុះឈ្មោះគណនី" },
  createAccountTitle: { en: "Create Account", kh: "ចុះឈ្មោះគណនី" },
  joinScamShield: { en: "Join ScamShield and help secure Cambodia from fraud.", kh: "ចូលរួមជាមួយ ScamShield ដើម្បីជួយការពារប្រទេសកម្ពុជាពីការបោកប្រាស់។" },
  systemRole: { en: "System Role (Sandbox Demo)", kh: "តួនាទីក្នុងប្រព័ន្ធ (សម្រាប់ការសាកល្បង)" },
  standardUser: { en: "Standard User", kh: "អ្នកប្រើប្រាស់ទូទៅ" },
  administrator: { en: "Administrator", kh: "អភិបាលប្រព័ន្ធ" },
  creatingAccount: { en: "Creating Account...", kh: "កំពុងបង្កើតគណនី..." },
  alreadyHaveAccount: { en: "Already have an account?", kh: "មានគណនីរួចហើយមែនទេ?" },
  signInLink: { en: "Sign In", kh: "ចូលគណនី" },

  // Footer
  footerDesc: { en: "An open-source, community-driven database dedicated to tracking and preventing phone scams, telecommunication frauds, and spoofing attempts across Cambodia.", kh: "ប្រព័ន្ធទិន្នន័យបើកចំហបង្កើតឡើងដោយសហគមន៍ ដើម្បីតាមដាន និងបង្ការការឆបោកតាមទូរស័ព្ទ ការបោកប្រាស់ទូរគមនាគមន៍ និងការបន្លំលេខទូរស័ព្ទនៅកម្ពុជា។" },
  footerDisclaimerTitle: { en: "Disclaimer: ", kh: "ការបដិសេធ៖ " },
  footerDisclaimerText: { en: "ScamShield is a lookup tool for public reference. Always verify with official authorities before making financial transfers.", kh: "ScamShield គឺជាឧបករណ៍ស្វែងរកសម្រាប់ជាឯកសារយោងសាធារណៈ។ សូមផ្ទៀងផ្ទាត់ជាមួយអាជ្ញាធរផ្លូវការជានិច្ច មុននឹងធ្វើការផ្ទេរប្រាក់។" },
  resourcesTitle: { en: "Resources", kh: "ប្រភពធនធាន" },
  authoritiesTitle: { en: "Authorities", kh: "អាជ្ញាធរផ្លូវការ" },
  reportToSupport: { en: "Report to Support", kh: "រាយការណ៍ទៅកាន់ផ្នែកគាំទ្រ" },
  allRightsReserved: { en: "All rights reserved.", kh: "រក្សាសិទ្ធិគ្រប់យ៉ាង។" },
  privacyPolicy: { en: "Privacy Policy", kh: "គោលការណ៍ឯកជនភាព" },
  termsOfService: { en: "Terms of Service", kh: "លក្ខខណ្ឌប្រើប្រាស់" },

  // Admin
  adminControls: { en: "Admin Controls", kh: "ផ្ទាំងគ្រប់គ្រងអភិបាល" },
  adminDesc: { en: "Moderation dashboards, metric reviews, and accounts management.", kh: "ផ្ទាំងគ្រប់គ្រងសម្រាប់ពិនិត្យរបាយការណ៍ ស្ថិតិ និងការគ្រប់គ្រងគណនីអ្នកប្រើប្រាស់។" },
  refreshData: { en: "Refresh Data", kh: "ទាញយកទិន្នន័យថ្មី" },
  syncRegistries: { en: "Synchronizing administrative registries...", kh: "កំពុងធ្វើបច្ចុប្បន្នភាពទិន្នន័យអភិបាល..." },
  scamCategorization: { en: "Scam Categorization", kh: "ការបែងចែកប្រភេទនៃការឆបោក" },
  highestRiskCallers: { en: "Highest Risk Callers", kh: "លេខដែលមានហានិភ័យខ្ពស់បំផុត" },
  moderationQueue: { en: "Moderation Queue", kh: "ជួររង់ចាំការពិនិត្យ" },
  userAccounts: { en: "User Accounts", kh: "គណនីអ្នកប្រើប្រាស់" },
  queueClear: { en: "Queue Clear", kh: "គ្មានរបាយការណ៍រង់ចាំទេ" },
  noReportsInSystem: { en: "There are currently no community scam reports filed in the system.", kh: "បច្ចុប្បន្ន មិនទាន់មានរបាយការណ៍សង្ស័យណាមួយរង់ចាំការពិនិត្យនៅក្នុងប្រព័ន្ធឡើយ។" },
  deleteReportBtn: { en: "Delete Report", kh: "លុបរបាយការណ៍" },
  confirmDeleteReport: { en: "Are you sure you want to delete this report? The phone number risk score will be automatically recalculated.", kh: "តើអ្នកប្រាកដជាចង់លុបរបាយការណ៍នេះមែនទេ? ពិន្ទុហានិភ័យរបស់លេខទូរស័ព្ទនេះនឹងត្រូវគណនាឡើងវិញដោយស្វ័យប្រវត្ត។" },
  submittedBy: { en: "Submitted by: ", kh: "ដាក់ស្នើដោយ៖ " },
  userEmailCol: { en: "User Email", kh: "អ៊ីមែលអ្នកប្រើ" },
  roleCol: { en: "Role", kh: "តួនាទី" },
  totalReportsCol: { en: "Total Reports", kh: "ចំនួនរបាយការណ៍" },
  joinDateCol: { en: "Join Date", kh: "ថ្ងៃចូលរួម" },
  accessDenied: { en: "Access Denied", kh: "ការចូលប្រើប្រាស់ត្រូវបានបដិសេធ" },
  adminRequiredDesc: { en: "Administrator credentials are required to view this dashboard. Please register or log in with an Admin account.", kh: "តម្រូវឱ្យមានសិទ្ធិជាអភិបាលប្រព័ន្ធ ដើម្បីមើលផ្ទាំងគ្រប់គ្រងនេះ។ សូមចុះឈ្មោះ ឬចូលគណនីជាមួយគណនី Admin។" },
  phoneRegistry: { en: "Phone Registry", kh: "បញ្ជីលេខទូរស័ព្ទ" },
  confirmDeletePhone: { en: "Are you sure you want to delete this phone number? All of its associated reports will be permanently deleted.", kh: "តើអ្នកប្រាកដជាចង់លុបលេខទូរស័ព្ទនេះមែនទេ? របាយការណ៍ទាំងអស់ដែលពាក់ព័ន្ធនឹងត្រូវលុបចោលជាអចិន្ត្រៃយ៍។" },
  confirmDeleteUser: { en: "Are you sure you want to delete this user account? All of their submitted reports will be permanently deleted.", kh: "តើអ្នកប្រាកដជាចង់លុបគណនីនេះមែនទេ? របាយការណ៍ទាំងអស់ដែលពួកគេបានដាក់ស្នើនឹងត្រូវលុបចោលជាអចិន្ត្រៃយ៍។" },
  editReportTitle: { en: "Edit Report Details", kh: "កែប្រែព័ត៌មានលម្អិតរបាយការណ៍" },
  saveChangesBtn: { en: "Save Changes", kh: "រក្សាទុកការផ្លាស់ប្តូរ" },
  cancelBtn: { en: "Cancel", kh: "បោះបង់" },
  descriptionLabel: { en: "Description", kh: "ការរៀបរាប់" },
  categoryLabelOnly: { en: "Category", kh: "ប្រភេទ" },
  callTracker: { en: "Call Tracker", kh: "ស្វែងរកទីតាំងខល" },
  incomingCall: { en: "Incoming Suspicious Call", kh: "ការខលចូលសង្ស័យ" },
  triangulationActive: { en: "Cell Tower Triangulation Active", kh: "កំពុងស្វែងរកទីតាំងតាមប្រព័ន្ធអង់តែន" },
  signalLocked: { en: "Signal Locked", kh: "បានចាក់សោទីតាំងច្បាស់លាស់" },
  transcription: { en: "Live Voice Transcription", kh: "ការបកប្រែសំឡេងផ្ទាល់" },
  blockReport: { en: "Block & Report", kh: "រាយការណ៍ & ប្លុក" },
  mute: { en: "Mute", kh: "បិទសំឡេង" },
  record: { en: "Record", kh: "ថតសំឡេង" },
  hangUp: { en: "Hang Up", kh: "បិទចោល" },
  simulatorControls: { en: "Reported Scammers List", kh: "បញ្ជីលេខទូរស័ព្ទឆបោក" },
  simulateScam: { en: "Simulate Scam Call", kh: "សាកល្បងខលបោកប្រាស់" },
  notFoundTitle: { en: "Page Not Found", kh: "រកមិនឃើញទំព័រនេះទេ" },
  notFoundDesc: { en: "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.", kh: "ទំព័រដែលអ្នកកំពុងស្វែងរកប្រហែលជាត្រូវបានលុបចោល ប្តូរឈ្មោះ ឬមិនអាចប្រើប្រាស់បានជាបណ្តោះអាសន្ន។" },
  returnHome: { en: "Return to Safety (Home)", kh: "ត្រឡប់ទៅកាន់ទំព័រដើម" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("kh"); // Default to Khmer

  // Load language from storage on mount
  useEffect(() => {
    const storedLang = localStorage.getItem("scamshield_lang") as Language;
    if (storedLang) {
      setLanguageState(storedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("scamshield_lang", lang);
  };

  const t = (key: string): string => {
    if (!translations[key]) return key;
    return translations[key][language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
