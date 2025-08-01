// Test script for mobile number parsing
const countryCodes = [
  { code: '+1', country: 'US/Canada' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+33', country: 'France' },
  { code: '+49', country: 'Germany' },
  { code: '+39', country: 'Italy' },
  { code: '+34', country: 'Spain' },
  { code: '+31', country: 'Netherlands' },
  { code: '+41', country: 'Switzerland' },
  { code: '+43', country: 'Austria' },
  { code: '+32', country: 'Belgium' },
  { code: '+45', country: 'Denmark' },
  { code: '+46', country: 'Sweden' },
  { code: '+47', country: 'Norway' },
  { code: '+358', country: 'Finland' },
  { code: '+86', country: 'China' },
  { code: '+81', country: 'Japan' },
  { code: '+82', country: 'South Korea' },
  { code: '+91', country: 'India' },
  { code: '+65', country: 'Singapore' },
  { code: '+60', country: 'Malaysia' },
  { code: '+62', country: 'Indonesia' },
  { code: '+63', country: 'Philippines' },
  { code: '+66', country: 'Thailand' },
  { code: '+84', country: 'Vietnam' },
  { code: '+856', country: 'Laos' },
  { code: '+852', country: 'Hong Kong' },
  { code: '+886', country: 'Taiwan' },
];

// Helper function to parse mobile number for edit mode
const parseMobileNumber = (fullMobile) => {
  if (!fullMobile) return { countryCode: '+66', mobile: '' }
  
  // Find matching country code from the full mobile number
  const matchingCountry = countryCodes.find(cc => fullMobile.startsWith(cc.code))
  
  if (matchingCountry) {
    return {
      countryCode: matchingCountry.code,
      mobile: fullMobile.substring(matchingCountry.code.length)
    }
  }
  
  // Default fallback
  return { countryCode: '+66', mobile: fullMobile }
}

// Test cases
const testCases = [
  '+66925139723',     // Thailand
  '+856123456789',    // Laos
  '+1234567890',      // US
  '+4407911123456',   // UK
  '+8562012345678',   // Should be Laos
  'invalidformat',    // Invalid format
  '',                 // Empty
  null,               // Null
  undefined           // Undefined
];

console.log('Testing mobile number parsing:');
console.log('===============================');

testCases.forEach(testCase => {
  const result = parseMobileNumber(testCase);
  console.log(`Input: "${testCase}" -> Country: ${result.countryCode}, Mobile: ${result.mobile}`);
});

console.log('\nTesting reconstruction:');
console.log('======================');

testCases.forEach(testCase => {
  if (testCase) {
    const parsed = parseMobileNumber(testCase);
    const reconstructed = parsed.mobile.startsWith('+') ? parsed.mobile : parsed.countryCode + parsed.mobile;
    console.log(`Original: "${testCase}" -> Reconstructed: "${reconstructed}" -> Match: ${testCase === reconstructed}`);
  }
});
