import { SCHEMES, evaluateEligibility } from './src/data/schemes';

const profile = {
  id: 'test',
  primaryLanguage: 'en',
  createdAt: '2023-01-01',
  name: 'Test',
  age: 30,
  gender: 'female',
  occupation: 'Farmer',
  location: 'District',
  state: 'State',
  householdIncome: 150000,
  category: 'OBC',
  disabilityStatus: false,
  existingDocuments: ['aadhaar', 'bank_passbook', 'ration_card'],
  readinessScore: 100
};

for (const scheme of SCHEMES) {
  const result = evaluateEligibility(scheme, profile as any);
  console.log(`${scheme.name}: ${result.score}%`);
}
