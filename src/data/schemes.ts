import { Scheme, SchemeRule, CitizenProfile, EligibilityResult } from '../types';

export const SCHEMES: Scheme[] = [
  {
    id: 'pm-vishwakarma',
    name: "PM Vishwakarma Yojana",
    nameLocal: "पीएम विश्वकर्मा योजना",
    description: "Support for traditional artisans and craftspeople with subsidized loans, skill training, and toolkit incentives.",
    descriptionLocal: "पारंपरिक कारीगरों और शिल्पकारों को ऋण, कौशल प्रशिक्षण और टूलकिट प्रोत्साहन का समर्थन।",
    benefits: "₹15,000 Toolkit incentive, skill training with ₹500/day stipend, and collateral-free loans up to ₹3,000,000 at 5% interest.",
    benefitsLocal: "₹15,000 टूलकिट प्रोत्साहन, ₹500/दिन वजीफे के साथ कौशल प्रशिक्षण, और 5% ब्याज पर ₹3,000,000 तक का संपार्श्विक-मुक्त ऋण।",
    department: "Ministry of Micro, Small and Medium Enterprises",
    category: "Business",
    requiredDocuments: ['aadhaar', 'bank_passbook'],
    referenceLink: "https://pmvishwakarma.gov.in/",
    rules: [
      { id: 'v1', schemeId: 'pm-vishwakarma', field: 'age', operator: 'greater_than_equal', value: '18' },
      { id: 'v2', schemeId: 'pm-vishwakarma', field: 'householdIncome', operator: 'less_than_equal', value: '300000' }
    ]
  },
  {
    id: 'pm-svanidhi',
    name: "PM SVANidhi",
    nameLocal: "पीएम स्वनिधि",
    description: "Special micro-credit facility for street vendors to enable access to affordable working capital loans for expanding business.",
    descriptionLocal: "रेहड़ी-पटरी वालों (स्ट्रीट वेंडर्स) के लिए व्यवसाय विस्तार हेतु किफायती कार्यशील पूंजी ऋण।",
    benefits: "First collateral-free loan of ₹10,000, subsequent loans of ₹20,000 and ₹50000 with 7% interest subsidy and cashback on digital transactions.",
    benefitsLocal: "पहला ₹10,000 का ऋण, बाद में डिजिटल लेनदेन पर कैशबैक के साथ ₹20,000 और ₹50,000 के ऋण।",
    department: "Ministry of Housing and Urban Affairs",
    category: "Business",
    requiredDocuments: ['aadhaar', 'voter_id', 'bank_passbook'],
    referenceLink: "https://pmsvanidhi.mohua.gov.in/",
    rules: [
      { id: 's1', schemeId: 'pm-svanidhi', field: 'occupation', operator: 'equals', value: 'Street vendor' },
      { id: 's2', schemeId: 'pm-svanidhi', field: 'age', operator: 'greater_than_equal', value: '18' }
    ]
  },
  {
    id: 'pm-kisan',
    name: "PM Kisan Samman Nidhi",
    nameLocal: "पीएम किसान सम्मान निधि",
    description: "Financial support to all landholding farmer families across the country to assist with agricultural purchases.",
    descriptionLocal: "कृषि खरीद में सहायता के लिए देश भर के सभी भूमिधारक किसान परिवारों को वित्तीय सहायता।",
    benefits: "Direct income support of ₹6,000 per year, paid in three equal installments of ₹2,000 directly into bank accounts.",
    benefitsLocal: "प्रति वर्ष ₹6,000 की प्रत्यक्ष आय सहायता, ₹2,000 की तीन समान किस्तों में सीधे बैंक खातों में।",
    department: "Ministry of Agriculture and Farmers Welfare",
    category: "Agriculture",
    requiredDocuments: ['aadhaar', 'bank_passbook', 'ration_card'],
    referenceLink: "https://pmkisan.gov.in/",
    rules: [
      { id: 'k1', schemeId: 'pm-kisan', field: 'occupation', operator: 'in', value: 'Farmer,Agriculture,Domestic worker' },
      { id: 'k2', schemeId: 'pm-kisan', field: 'householdIncome', operator: 'less_than_equal', value: '250000' }
    ]
  },
  {
    id: 'ayushman-bharat',
    name: "Ayushman Bharat PM-JAY",
    nameLocal: "आयुष्मान भारत योजना",
    description: "National health protection scheme providing health cover for secondary and tertiary care hospitalization to poor families.",
    descriptionLocal: "गरीब परिवारों को माध्यमिक और तृतीयक देखभाल अस्पताल में भर्ती के लिए स्वास्थ्य बीमा प्रदान करने वाली राष्ट्रीय स्वास्थ्य योजना।",
    benefits: "Cashless health cover of up to ₹500,000 per family per year for secondary and tertiary care hospitalization across impaneled hospitals.",
    benefitsLocal: "प्रति वर्ष प्रति परिवार ₹500,000 तक का कैशलेस स्वास्थ्य बीमा स्वास्थ्य सुरक्षा।",
    department: "National Health Authority",
    category: "Healthcare",
    requiredDocuments: ['aadhaar', 'ration_card'],
    referenceLink: "https://pmjay.gov.in/",
    rules: [
      { id: 'ab1', schemeId: 'ayushman-bharat', field: 'householdIncome', operator: 'less_than_equal', value: '250000' }
    ]
  },
  {
    id: 'pm-awas-yojana',
    name: "PM Awas Yojana (Urban/Gramin)",
    nameLocal: "प्रधानमंत्री आवास योजना",
    description: "Affordable housing scheme aiming to build pucca houses with clean water, electricity, and sanitation facilities for homeless families.",
    descriptionLocal: "बेघर परिवारों के लिए साफ पानी, बिजली और शौचालय की सुविधाओं के साथ पक्के मकान बनाने की योजना।",
    benefits: "Financial assistance of ₹120,000 in plains and ₹130,000 in hilly/difficult areas for house construction, plus interest subsidies on loans.",
    benefitsLocal: "मकान निर्माण के लिए मैदानी क्षेत्रों में ₹120,000 और पहाड़ी क्षेत्रों में ₹130,000 की सहायता।",
    department: "Ministry of Rural Development / Housing",
    category: "Housing",
    requiredDocuments: ['aadhaar', 'ration_card', 'income_cert'],
    referenceLink: "https://pmayg.nic.in/",
    rules: [
      { id: 'ay1', schemeId: 'pm-awas-yojana', field: 'householdIncome', operator: 'less_than_equal', value: '300000' }
    ]
  },
  {
    id: 'janani-suraksha',
    name: "Janani Suraksha Yojana",
    nameLocal: "जननी सुरक्षा योजना",
    description: "Safe motherhood intervention scheme encouraging institutional delivery among poor pregnant women with direct cash assistance.",
    descriptionLocal: "नकद सहायता के साथ गरीब गर्भवती महिलाओं के बीच संस्थागत प्रसव (अस्पताल में प्रसव) को बढ़ावा देने वाली योजना।",
    benefits: "Cash assistance of ₹1,400 for rural mothers and ₹1,000 for urban mothers, plus incentives for accredited social health activists (ASHA).",
    benefitsLocal: "ग्रामीण माताओं के लिए ₹1,400 और शहरी माताओं के लिए ₹1,000 की वित्तीय सहायता।",
    department: "Ministry of Health and Family Welfare",
    category: "Healthcare",
    requiredDocuments: ['aadhaar', 'bank_passbook'],
    referenceLink: "https://nhm.gov.in/",
    rules: [
      { id: 'jsy1', schemeId: 'janani-suraksha', field: 'gender', operator: 'equals', value: 'female' },
      { id: 'jsy2', schemeId: 'janani-suraksha', field: 'age', operator: 'greater_than_equal', value: '19' }
    ]
  },
  {
    id: 'national-scholarship',
    name: "National Scholarship Scheme",
    nameLocal: "राष्ट्रीय छात्रवृत्ति योजना",
    description: "Scholarships for students from weaker sections, minority communities, and disabled youth to enable quality education.",
    descriptionLocal: "कमजोर वर्गों, अल्पसंख्यक समुदायों और दिव्यांग युवाओं के लिए गुणवत्तापूर्ण शिक्षा को सक्षम करने के लिए छात्रवृत्ति।",
    benefits: "Direct financial reimbursement for tuition fees, books, and hostel expenses ranging from ₹5,000 to ₹50,000 per year directly to the student.",
    benefitsLocal: "ट्यूशन फीस, किताबों और छात्रावास के खर्चों के लिए प्रति वर्ष ₹5,000 से ₹50,000 तक की प्रत्यक्ष सहायता।",
    department: "Ministry of Education",
    category: "Scholarship",
    requiredDocuments: ['aadhaar', 'income_cert', 'bank_passbook'],
    referenceLink: "https://scholarships.gov.in/",
    rules: [
      { id: 'ns1', schemeId: 'national-scholarship', field: 'occupation', operator: 'equals', value: 'Student' },
      { id: 'ns2', schemeId: 'national-scholarship', field: 'householdIncome', operator: 'less_than_equal', value: '250000' }
    ]
  },
  {
    id: 'widow-pension',
    name: "Indira Gandhi National Widow Pension Scheme",
    nameLocal: "इंदिरा गांधी राष्ट्रीय विधवा पेंशन योजना",
    description: "Monthly financial pension to widows from low income families to secure their livelihood.",
    descriptionLocal: "कम आय वाले परिवारों की विधवाओं को उनकी आजीविका सुरक्षित करने के लिए मासिक वित्तीय पेंशन।",
    benefits: "Monthly cash pension of ₹300 to ₹500 for widows below poverty line, with additional state top-ups ranging up to ₹1,500/month.",
    benefitsLocal: "गरीबी रेखा से नीचे की विधवाओं के लिए ₹300 से ₹500 की मासिक नकद पेंशन, अतिरिक्त राज्य टॉप-अप के साथ।",
    department: "Ministry of Rural Development",
    category: "Pension",
    requiredDocuments: ['aadhaar', 'income_cert', 'bank_passbook'],
    rules: [
      { id: 'wp1', schemeId: 'widow-pension', field: 'gender', operator: 'equals', value: 'female' },
      { id: 'wp2', schemeId: 'widow-pension', field: 'age', operator: 'greater_than_equal', value: '40' }
    ]
  },
  {
    id: 'disability-pension',
    name: "National Disability Pension Scheme",
    nameLocal: "राष्ट्रीय दिव्यांग पेंशन योजना",
    description: "Financial assistance for persons with severe or multiple disabilities belonging to low-income families.",
    descriptionLocal: "कम आय वाले परिवारों के गंभीर या बहु-दिव्यांग व्यक्तियों के लिए वित्तीय सहायता।",
    benefits: "Monthly pension support of ₹300 per month (below 80 years) and ₹500 per month (above 80 years) directly credited to accounts, plus state supplements.",
    benefitsLocal: "बैंक खातों में सीधे जमा की जाने वाली मासिक पेंशन सहायता, अतिरिक्त राज्य सहायता के साथ।",
    department: "Ministry of Social Justice and Empowerment",
    category: "Pension",
    requiredDocuments: ['aadhaar', 'disability_cert', 'bank_passbook'],
    rules: [
      { id: 'dp1', schemeId: 'disability-pension', field: 'disabilityStatus', operator: 'equals', value: 'true' },
      { id: 'dp2', schemeId: 'disability-pension', field: 'age', operator: 'greater_than_equal', value: '18' }
    ]
  },
  {
    id: 'skill-india',
    name: "Skill India Mission (PMKVY)",
    nameLocal: "कौशल भारत मिशन",
    description: "Skill certification scheme that enables Indian youth to take up industry-relevant skill training that helps them secure a better livelihood.",
    descriptionLocal: "कौशल प्रमाणन योजना जो भारतीय युवाओं को उद्योग-प्रासंगिक कौशल प्रशिक्षण प्राप्त करने में सक्षम बनाती है।",
    benefits: "Free industry-relevant skill training, soft skills, entrepreneurship guidance, and government-recognized skill certificate with job placement assistance.",
    benefitsLocal: "निशुल्क कौशल प्रशिक्षण, सॉफ्ट स्किल्स, उद्यमिता मार्गदर्शन, और नौकरी प्लेसमेंट सहायता के साथ प्रमाण पत्र।",
    department: "Ministry of Skill Development and Entrepreneurship",
    requiredDocuments: ['aadhaar'],
    category: "Scholarship",
    rules: [
      { id: 'sk1', schemeId: 'skill-india', field: 'age', operator: 'greater_than_equal', value: '15' },
      { id: 'sk2', schemeId: 'skill-india', field: 'age', operator: 'less_than_equal', value: '45' }
    ]
  }
];

export function evaluateEligibility(scheme: Scheme, profile: CitizenProfile): EligibilityResult {
  const missingRequirements: string[] = [];
  let matchedCount = 0;
  const totalRules = scheme.rules.length;

  for (const rule of scheme.rules) {
    let rulePassed = false;
    const profileValue = (profile as any)[rule.field];

    switch (rule.operator) {
      case 'equals':
        rulePassed = String(profileValue).toLowerCase() === rule.value.toLowerCase();
        if (!rulePassed) {
          missingRequirements.push(`${rule.field === 'occupation' ? 'Occupation' : rule.field} must be ${rule.value}`);
        }
        break;
      case 'not_equals':
        rulePassed = String(profileValue).toLowerCase() !== rule.value.toLowerCase();
        if (!rulePassed) {
          missingRequirements.push(`${rule.field} must not be ${rule.value}`);
        }
        break;
      case 'greater_than':
        rulePassed = Number(profileValue) > Number(rule.value);
        if (!rulePassed) {
          missingRequirements.push(`${rule.field === 'householdIncome' ? 'Household Income' : rule.field} must be greater than ${rule.value}`);
        }
        break;
      case 'less_than':
        rulePassed = Number(profileValue) < Number(rule.value);
        if (!rulePassed) {
          missingRequirements.push(`${rule.field === 'householdIncome' ? 'Household Income' : rule.field} must be less than ${rule.value}`);
        }
        break;
      case 'greater_than_equal':
        rulePassed = Number(profileValue) >= Number(rule.value);
        if (!rulePassed) {
          missingRequirements.push(`${rule.field === 'householdIncome' ? 'Household Income' : rule.field} must be at least ${rule.value}`);
        }
        break;
      case 'less_than_equal':
        rulePassed = Number(profileValue) <= Number(rule.value);
        if (!rulePassed) {
          missingRequirements.push(`${rule.field === 'householdIncome' ? 'Household Income' : rule.field} must be at most ${rule.value}`);
        }
        break;
      case 'in':
        const allowedValues = rule.value.toLowerCase().split(',').map(s => s.trim());
        rulePassed = allowedValues.includes(String(profileValue).toLowerCase());
        if (!rulePassed) {
          missingRequirements.push(`${rule.field} must be one of: ${rule.value}`);
        }
        break;
      case 'exists':
        rulePassed = profileValue !== undefined && profileValue !== null && profileValue !== '';
        if (!rulePassed) {
          missingRequirements.push(`Requirement for ${rule.field} is missing`);
        }
        break;
      default:
        break;
    }

    if (rulePassed) {
      matchedCount++;
    }
  }

  // Check missing documents
  const missingDocs = scheme.requiredDocuments.filter(doc => !profile.existingDocuments.includes(doc));
  for (const doc of missingDocs) {
    missingRequirements.push(`Missing document: ${doc.toUpperCase().replace('_', ' ')}`);
  }

  // Calculate score
  // Rules weigh 70% and documents weigh 30% of eligibility readiness
  const ruleWeight = totalRules > 0 ? (matchedCount / totalRules) * 70 : 70;
  const docWeight = scheme.requiredDocuments.length > 0 ? 
    ((scheme.requiredDocuments.length - missingDocs.length) / scheme.requiredDocuments.length) * 30 : 30;

  const score = Math.round(ruleWeight + docWeight);
  const matched = missingRequirements.length === 0;

  let reasoning = '';
  if (matched) {
    reasoning = `Congratulations! You meet all specified age, income, and occupational criteria for ${scheme.name}. You also have all the required documents (${scheme.requiredDocuments.join(', ').toUpperCase()}).`;
  } else {
    reasoning = `You match ${score}% of the requirements for ${scheme.name}. To complete eligibility, you need to address the following: ${missingRequirements.join('; ')}.`;
  }

  return {
    schemeId: scheme.id,
    schemeName: scheme.name,
    matched,
    score,
    missingRequirements,
    reasoning
  };
}
