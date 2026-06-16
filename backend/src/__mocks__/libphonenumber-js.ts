/**
 * Manual mock for libphonenumber-js.
 * Jest ESM cannot load the libphonenumber-js metadata JSON correctly, so we
 * replace the entire module with a lightweight stub that satisfies all
 * test scenarios used in the test suite.
 */

export const parsePhoneNumberFromString = (num: string, _defaultCountry?: string) => {
  // Simulate invalid numbers
  if (!num || num === "123" || num === "+85500000000" || num.toLowerCase().includes("invalid")) {
    return null;
  }
  // Simulate valid Cambodian numbers
  const normalized = num.startsWith("+") ? num : `+855${num.replace(/^0/, "")}`;
  return {
    isValid: () => true,
    number: normalized,
    country: "KH",
    countryCallingCode: "855",
    nationalNumber: normalized.replace("+855", ""),
  };
};

export const parsePhoneNumber = parsePhoneNumberFromString;

export default { parsePhoneNumberFromString, parsePhoneNumber };
