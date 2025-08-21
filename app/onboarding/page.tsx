"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Check } from "lucide-react"
import Image from "next/image"
import { logger } from "@/lib/logger"

export default function Onboarding() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    occupation: "",
    otherOccupation: "",
    placeOfWork: "",
    otherPlaceOfWork: "",
    experience: "",
    institution: "",
    specialties: [] as string[],
    otherSpecialty: "",
    country: ""
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [autoFilledNames, setAutoFilledNames] = useState({ firstName: false, lastName: false })

  const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false)
  const [showExperienceDropdown, setShowExperienceDropdown] = useState(false)
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false)
  const [showPlaceOfWorkDropdown, setShowPlaceOfWorkDropdown] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [specialtiesSearchTerm, setSpecialtiesSearchTerm] = useState('');
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const specialtiesRef = useRef<HTMLDivElement>(null)
  const experienceRef = useRef<HTMLDivElement>(null)
  const professionRef = useRef<HTMLDivElement>(null)
  const placeOfWorkRef = useRef<HTMLDivElement>(null)
  const countryRef = useRef<HTMLDivElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login"
    }
  }, [user, authLoading])

  // Check email verification and auto-fill names from OAuth providers
  useEffect(() => {
    if (!authLoading && user) {
      // Check if user signed in via OAuth providers (they should be trusted)
      const isOAuthUser = user.providerData.some(provider => 
        provider.providerId === 'google.com' || 
        provider.providerId === 'microsoft.com'
      )
      
      logger.debug("Email verification status:", { 
        emailVerified: user.emailVerified, 
        isOAuthUser,
        providers: user.providerData.map(p => p.providerId)
      })
      
      // Auto-fill names from OAuth display name if available
      if (isOAuthUser && user.displayName && !formData.firstName && !formData.lastName) {
        const displayName = user.displayName.trim();
        const nameParts = displayName.split(' ');
        
        if (nameParts.length >= 2) {
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' '); // Handle multiple last names
          
          setFormData(prev => ({
            ...prev,
            firstName,
            lastName
          }));
          setAutoFilledNames({ firstName: true, lastName: true });
        } else if (nameParts.length === 1) {
          // Only first name available
          setFormData(prev => ({
            ...prev,
            firstName: nameParts[0]
          }));
          setAutoFilledNames({ firstName: true, lastName: false });
        }
      }
      
      // Note: We no longer block access for unverified emails
      // Instead, we'll show a reminder within the onboarding flow
    }
  }, [user, authLoading])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateRequiredFields = () => {
    const requiredFields = {
      firstName: "First Name",
      occupation: "Occupation",
      experience: "Experience",
      placeOfWork: "Place of Work",
      country: "Country",
      specialties: "Specialties"
    }

    const errors: Record<string, string> = {}
    let hasErrors = false

    Object.entries(requiredFields).forEach(([key, label]) => {
      if (!formData[key as keyof typeof formData]) {
        errors[key] = `${label} is required`
        hasErrors = true
      }
    })

    // Additional validation for "other" fields
    if (formData.occupation === "other" && !formData.otherOccupation) {
      errors.otherOccupation = "Please specify your occupation"
      hasErrors = true
    }

    if (formData.specialties.includes("other") && !formData.otherSpecialty) {
      errors.otherSpecialty = "Please specify your specialty"
      hasErrors = true
    }

    if (!formData.specialties.length) {
      errors.specialties = "Please select at least one specialty"
      hasErrors = true
    }

    setFieldErrors(errors)
    return !hasErrors
  }

  const handleCompleteRegistration = async () => {
    if (!validateRequiredFields() || !user || !termsAgreed) {
      if (!termsAgreed) {
        setError("Please accept the Terms of Use to continue")
      }
      return
    }

    setLoading(true)
    setError("")

    try {
      const { getFirebaseFirestore } = await import("@/lib/firebase")
      const { doc, updateDoc } = await import("firebase/firestore")

      const db = await getFirebaseFirestore()
      if (!db) {
        throw new Error("Firestore not initialized")
      }

      // Create user profile data
      const userProfileData = {
        email: user.email,
        onboardingCompleted: true,
        updatedAt: new Date().toISOString(),
        // Add additional profile fields
        displayName: formData.lastName ? `${formData.firstName} ${formData.lastName}` : formData.firstName,
        firstName: formData.firstName,
        lastName: formData.lastName || "",
        country: formData.country,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName || "",
          country: formData.country,
          email: user.email,
          occupation: formData.occupation === "other" ? formData.otherOccupation : formData.occupation,
          placeOfWork: formData.placeOfWork === "other" ? formData.otherPlaceOfWork : formData.placeOfWork,
          experience: formData.experience,
          institution: formData.institution,
          specialties: formData.specialties.map(s => s === "other" ? formData.otherSpecialty : s),
          otherOccupation: formData.otherOccupation,
          otherPlaceOfWork: formData.otherPlaceOfWork,
          otherSpecialty: formData.otherSpecialty,
        }
      }

      // Update user document
      await updateDoc(doc(db, "users", user.uid), userProfileData)

      setRegistrationSuccess(true)
    } catch (err: any) {
      logger.error("Error during onboarding:", err)
      setError(err.message || "An error occurred during onboarding")
    } finally {
      setLoading(false)
    }
  }

  // Add global styles for placeholder font size
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      input::placeholder, 
      select::placeholder,
      input[type="text"]::placeholder,
      input[type="date"]::placeholder,
      select option[disabled],
      select option,
      select {
        font-size: 12px !important;
        font-weight: normal !important;
        color: #9ca3af !important;
      }
      .placeholder-text {
        font-size: 12px !important;
        color: #9ca3af !important;
      }
      /* Ensure select dropdowns and their options use 12px */
      select, select option {
        font-size: 12px !important;
      }
      /* Date input specific styling */
      input[type="date"] {
        font-size: 12px !important;
      }
      /* Ensure all input text uses consistent styling */
      input[type="text"], input[type="date"], select {
        font-size: 12px !important;
        color: #223258 !important;
      }
      /* Ensure selected text in custom dropdowns is consistent */
      .custom-dropdown-selected {
        font-size: 12px !important;
        color: #223258 !important;
      }
      /* Ensure placeholders remain gray */
      ::placeholder {
        color: #9ca3af !important;
      }
      /* Remove blue autofill background and ensure white background */
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 30px white inset !important;
        -webkit-text-fill-color: #223258 !important;
        background-color: white !important;
      }
      /* Ensure all form inputs maintain white background */
      input[type="text"], input[type="date"], select, .custom-dropdown-field {
        background-color: white !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (specialtiesRef.current && event.target instanceof Node && !specialtiesRef.current.contains(event.target)) {
        setShowSpecialtiesDropdown(false);
        setSpecialtiesSearchTerm('');
      }
      if (experienceRef.current && event.target instanceof Node && !experienceRef.current.contains(event.target)) {
        setShowExperienceDropdown(false);
      }
      if (professionRef.current && event.target instanceof Node && !professionRef.current.contains(event.target)) {
        setShowProfessionDropdown(false);
      }
      if (placeOfWorkRef.current && event.target instanceof Node && !placeOfWorkRef.current.contains(event.target)) {
        setShowPlaceOfWorkDropdown(false);
      }
      if (countryRef.current && event.target instanceof Node && !countryRef.current.contains(event.target)) {
        setShowCountryDropdown(false);
        setCountrySearchTerm('');
      }

    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const specialtiesOptions = [
    { value: "anesthesiology", label: "Anesthesiology" },
    { value: "allergy-immunology", label: "Allergy & Immunology" },
    { value: "cardiology", label: "Cardiology" },
    { value: "critical-care", label: "Critical Care" },
    { value: "dermatology", label: "Dermatology" },
    { value: "emergency-medicine", label: "Emergency Medicine" },
    { value: "endocrinology", label: "Endocrinology" },
    { value: "family-medicine", label: "Family Medicine" },
    { value: "gastroenterology", label: "Gastroenterology" },
    { value: "geriatrics", label: "Geriatrics" },
    { value: "hematology", label: "Hematology" },
    { value: "infectious-disease", label: "Infectious Disease" },
    { value: "internal-medicine", label: "Internal Medicine" },
    { value: "microbiology", label: "Microbiology" },
    { value: "nephrology", label: "Nephrology" },
    { value: "neurology", label: "Neurology" },
    { value: "nuclear-medicine", label: "Nuclear Medicine" },
    { value: "obstetrics-gynecology", label: "Obstetrics and Gynecology" },
    { value: "oncology", label: "Oncology" },
    { value: "ophthalmology", label: "Ophthalmology" },
    { value: "orthopedics", label: "Orthopedics" },
    { value: "otolaryngology", label: "Otolaryngology" },
    { value: "palliative-care", label: "Palliative Care Medicine" },
    { value: "pathology", label: "Pathology" },
    { value: "pediatrics", label: "Pediatrics" },
    { value: "psychiatry", label: "Psychiatry" },
    { value: "pulmonology", label: "Pulmonology" },
    { value: "radiology", label: "Radiology" },
    { value: "reproductive-endocrinology", label: "Reproductive Endocrinology & Infertility" },
    { value: "rheumatology", label: "Rheumatology" },
    { value: "sports-medicine", label: "Sports Medicine" },
    { value: "surgery", label: "Surgery" },
    { value: "urology", label: "Urology" },
    { value: "other", label: "Other" },
  ];

  const experienceOptions = [
    { value: "1-3", label: "1-3 years" },
    { value: "3-7", label: "3-7 years" },
    { value: "7-10", label: "7-10 years" },
    { value: "10-15", label: "10-15 years" },
    { value: "15+", label: "+15 years" },
  ];

  const professionOptions = [
    { value: "physician", label: "Physician" },
    { value: "fellow", label: "Fellow" },
    { value: "consultant", label: "Consultant" },
    { value: "intern-resident", label: "Intern/Resident" },
    { value: "student", label: "Student" },
    { value: "pharmacist", label: "Pharmacist" },
    { value: "advanced-practice-nurse", label: "Advanced Practice Nurse" },
    { value: "dentist", label: "Dentist" },
    { value: "medical-librarian", label: "Medical Librarian" },
    { value: "other", label: "Other" },
  ];

  const placeOfWorkOptions = [
    { value: "hospital-clinic", label: "Hospital/Clinic" },
    { value: "outpatient-clinic", label: "Outpatient Clinic" },
    { value: "private-practice", label: "Private Practice" },
    { value: "university", label: "University" },
    { value: "other", label: "Other" },
  ];



  const countryOptions: Record<string, string> = {
    "afghanistan": "Afghanistan",
    "albania": "Albania",
    "algeria": "Algeria",
    "andorra": "Andorra",
    "angola": "Angola",
    "antigua-and-barbuda": "Antigua and Barbuda",
    "argentina": "Argentina",
    "armenia": "Armenia",
    "australia": "Australia",
    "austria": "Austria",
    "azerbaijan": "Azerbaijan",
    "bahamas": "Bahamas",
    "bahrain": "Bahrain",
    "bangladesh": "Bangladesh",
    "barbados": "Barbados",
    "belarus": "Belarus",
    "belgium": "Belgium",
    "belize": "Belize",
    "benin": "Benin",
    "bhutan": "Bhutan",
    "bolivia": "Bolivia",
    "bosnia-and-herzegovina": "Bosnia and Herzegovina",
    "botswana": "Botswana",
    "brazil": "Brazil",
    "brunei": "Brunei",
    "bulgaria": "Bulgaria",
    "burkina-faso": "Burkina Faso",
    "burundi": "Burundi",
    "cabo-verde": "Cabo Verde",
    "cambodia": "Cambodia",
    "cameroon": "Cameroon",
    "canada": "Canada",
    "central-african-republic": "Central African Republic",
    "chad": "Chad",
    "chile": "Chile",
    "china": "China",
    "colombia": "Colombia",
    "comoros": "Comoros",
    "congo": "Congo",
    "costa-rica": "Costa Rica",
    "croatia": "Croatia",
    "cuba": "Cuba",
    "cyprus": "Cyprus",
    "czech-republic": "Czech Republic",
    "denmark": "Denmark",
    "djibouti": "Djibouti",
    "dominica": "Dominica",
    "dominican-republic": "Dominican Republic",
    "ecuador": "Ecuador",
    "egypt": "Egypt",
    "el-salvador": "El Salvador",
    "equatorial-guinea": "Equatorial Guinea",
    "eritrea": "Eritrea",
    "estonia": "Estonia",
    "eswatini": "Eswatini",
    "ethiopia": "Ethiopia",
    "fiji": "Fiji",
    "finland": "Finland",
    "france": "France",
    "gabon": "Gabon",
    "gambia": "Gambia",
    "georgia": "Georgia",
    "germany": "Germany",
    "ghana": "Ghana",
    "greece": "Greece",
    "grenada": "Grenada",
    "guatemala": "Guatemala",
    "guinea": "Guinea",
    "guinea-bissau": "Guinea-Bissau",
    "guyana": "Guyana",
    "haiti": "Haiti",
    "honduras": "Honduras",
    "hungary": "Hungary",
    "iceland": "Iceland",
    "india": "India",
    "indonesia": "Indonesia",
    "iran": "Iran",
    "iraq": "Iraq",
    "ireland": "Ireland",
    "israel": "Israel",
    "italy": "Italy",
    "jamaica": "Jamaica",
    "japan": "Japan",
    "jordan": "Jordan",
    "kazakhstan": "Kazakhstan",
    "kenya": "Kenya",
    "kiribati": "Kiribati",
    "kuwait": "Kuwait",
    "kyrgyzstan": "Kyrgyzstan",
    "laos": "Laos",
    "latvia": "Latvia",
    "lebanon": "Lebanon",
    "lesotho": "Lesotho",
    "liberia": "Liberia",
    "libya": "Libya",
    "liechtenstein": "Liechtenstein",
    "lithuania": "Lithuania",
    "luxembourg": "Luxembourg",
    "madagascar": "Madagascar",
    "malawi": "Malawi",
    "malaysia": "Malaysia",
    "maldives": "Maldives",
    "mali": "Mali",
    "malta": "Malta",
    "marshall-islands": "Marshall Islands",
    "mauritania": "Mauritania",
    "mauritius": "Mauritius",
    "mexico": "Mexico",
    "micronesia": "Micronesia",
    "moldova": "Moldova",
    "monaco": "Monaco",
    "mongolia": "Mongolia",
    "montenegro": "Montenegro",
    "morocco": "Morocco",
    "mozambique": "Mozambique",
    "myanmar": "Myanmar",
    "namibia": "Namibia",
    "nauru": "Nauru",
    "nepal": "Nepal",
    "netherlands": "Netherlands",
    "new-zealand": "New Zealand",
    "nicaragua": "Nicaragua",
    "niger": "Niger",
    "nigeria": "Nigeria",
    "north-korea": "North Korea",
    "north-macedonia": "North Macedonia",
    "norway": "Norway",
    "oman": "Oman",
    "pakistan": "Pakistan",
    "palau": "Palau",
    "palestine": "Palestine",
    "panama": "Panama",
    "papua-new-guinea": "Papua New Guinea",
    "paraguay": "Paraguay",
    "peru": "Peru",
    "philippines": "Philippines",
    "poland": "Poland",
    "portugal": "Portugal",
    "qatar": "Qatar",
    "romania": "Romania",
    "russia": "Russia",
    "rwanda": "Rwanda",
    "saint-kitts-and-nevis": "Saint Kitts and Nevis",
    "saint-lucia": "Saint Lucia",
    "saint-vincent-and-the-grenadines": "Saint Vincent and the Grenadines",
    "samoa": "Samoa",
    "san-marino": "San Marino",
    "sao-tome-and-principe": "Sao Tome and Principe",
    "saudi-arabia": "Saudi Arabia",
    "senegal": "Senegal",
    "serbia": "Serbia",
    "seychelles": "Seychelles",
    "sierra-leone": "Sierra Leone",
    "singapore": "Singapore",
    "slovakia": "Slovakia",
    "slovenia": "Slovenia",
    "solomon-islands": "Solomon Islands",
    "somalia": "Somalia",
    "south-africa": "South Africa",
    "south-korea": "South Korea",
    "south-sudan": "South Sudan",
    "spain": "Spain",
    "sri-lanka": "Sri Lanka",
    "sudan": "Sudan",
    "suriname": "Suriname",
    "sweden": "Sweden",
    "switzerland": "Switzerland",
    "syria": "Syria",
    "taiwan": "Taiwan",
    "tajikistan": "Tajikistan",
    "tanzania": "Tanzania",
    "thailand": "Thailand",
    "timor-leste": "Timor-Leste",
    "togo": "Togo",
    "tonga": "Tonga",
    "trinidad-and-tobago": "Trinidad and Tobago",
    "tunisia": "Tunisia",
    "turkey": "Turkey",
    "turkmenistan": "Turkmenistan",
    "tuvalu": "Tuvalu",
    "uganda": "Uganda",
    "ukraine": "Ukraine",
    "united-arab-emirates": "United Arab Emirates",
    "united-kingdom": "United Kingdom",
    "united-states": "United States",
    "uruguay": "Uruguay",
    "uzbekistan": "Uzbekistan",
    "vanuatu": "Vanuatu",
    "vatican-city": "Vatican City",
    "venezuela": "Venezuela",
    "vietnam": "Vietnam",
    "yemen": "Yemen",
    "zambia": "Zambia",
    "zimbabwe": "Zimbabwe"
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-4 ">
            <div className="flex items-center justify-center mb-2">
              <Image
                src="/full-icon.svg"
                alt="DR. INFO Logo"
                width={200}
                height={57}
                className="text-white"
              />
            </div>
            <h2 className="font-semibold text-[#223258] mt-6 mb-6 text-[20px] sm:text-[20px] font-dm-sans">
              Complete Registration
            </h2>
            {/* Step Indicator with both steps checked */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center">
                <div className="flex items-center justify-center rounded-full font-medium transition-all duration-200 border border-[#3771FE]/50 font-dm-sans bg-[#3771FE] text-white w-8 h-8 text-base">
                  <Check size={20} strokeWidth={3} className="text-white" />
                </div>
                <div className="h-0.5 w-10 bg-[#3771FE]" />
                <div className="flex items-center justify-center rounded-full font-medium transition-all duration-200 border border-[#3771FE]/50 font-dm-sans bg-[#3771FE] text-white w-8 h-8 text-base">
                  <Check size={20} strokeWidth={3} className="text-white" />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#F4F7FF] shadow-lg border border-[#3771FE]/50 px-8 py-8 rounded-[5px] text-center">
            <div className="flex flex-col items-center mb-4">
              <Image
                src="/password-success.svg"
                alt="Success"
                width={40}
                height={40}
                className="mb-2"
              />
              <h3 className="text-xl font-semibold text-[#223258] mb-2" style={{ fontFamily: 'DM Sans', fontSize: 20, fontWeight: 550 }}>
                Registration Complete!
              </h3>
              <p className="text-[#223258] mb-4" style={{ fontFamily: 'DM Sans', fontWeight: 400 }}>
                Your registration is now complete. You can now access the full features of DR. INFO.
              </p>
            </div>
            <button
              className="w-full bg-[#C6D7FF]/50 text-[#3771FE] py-2 px-4 border border-[#3771FE]/50 rounded-[5px] font-dm-sans font-medium hover:bg-[#C6D7FF]/70 transition-colors duration-200"
              style={{ fontFamily: 'DM Sans', fontSize: 14 }}
              onClick={() => router.push('/dashboard')}
            >
              Let's Get Started...
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 pb-4 sm:pb-8">
      <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[600px]">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2 pt-6 sm:pt-8 md:pt-10 mt-6 sm:mt-8 md:mt-10">
            <Image
              src="/full-icon.svg"
              alt="DR. INFO Logo"
              width={150}
              height={43}
              className="text-white sm:w-[180px] md:w-[200px]"
            />
          </div>
          <h2 className="font-semibold text-[#223258] mt-4 sm:mt-6 mb-4 sm:mb-6 text-[24px] sm:text-[28px] font-dm-sans">
            Complete Registration
          </h2>
           

        </div>

        {/* Form Container */}
        <div className="bg-[#F4F7FF] border border-[#3771FE]/50 px-4 sm:px-6 md:px-8 py-4 sm:py-5 rounded-[5px]">
          {/* Single Step: Customer Information Form */}
          <div className="space-y-3 sm:space-y-4">
              {/* Personalized Experience Message */}
              <div className="text-center mb-2">
                <p className="text-gray-500 text-xs" style={{ fontFamily: 'DM Sans', fontWeight: 400 }}>
                  Please fill in these fields to get a personalized, tailor-made experience
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>
                    First Name <span className="text-black">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`px-3 py-2 sm:py-2.5 border ${fieldErrors.firstName ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full bg-white placeholder-text custom-dropdown-selected custom-dropdown-field`}
                  />
                  {fieldErrors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name (Optional)"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`px-3 py-2 sm:py-2.5 border ${fieldErrors.lastName ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full bg-white placeholder-text custom-dropdown-selected custom-dropdown-field`}
                  />
                  {fieldErrors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>



              {/* Profession and Years of Experience in one row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Profession <span className="text-black">*</span></label>
                  <div className="relative" ref={professionRef}>
                    <div
                      className={`w-full min-h-[40px] px-2 py-1 border ${fieldErrors.occupation ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white flex items-center justify-between gap-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent placeholder-text`}
                      tabIndex={0}
                      onClick={() => setShowProfessionDropdown(true)}
                      style={{ cursor: 'text', position: 'relative' }}
                    >
                                             {formData.occupation === "" && (
                         <span className="text-gray-400 select-none" style={{ fontSize: '12px', color: '#9ca3af' }}>Select Profession</span>
                       )}
                                             {formData.occupation !== "" && (
                         <span className="text-[#223258] select-none" style={{ fontSize: '12px' }}>
                           {formData.occupation === "other" ? formData.otherOccupation : formData.occupation.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                         </span>
                       )}
                    </div>
                    {showProfessionDropdown && (
                      <div className="absolute z-10 left-0 right-0 bg-white border border-[#3771FE]/50 rounded-b-[5px] shadow-lg max-h-48 overflow-y-auto mt-1">
                        {professionOptions.filter(opt => opt.value !== formData.occupation).map(opt => (
                           <div
                             key={opt.value}
                             className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer"
                             style={{ fontSize: '12px', color: '#223258' }}
                             onClick={() => {
                               setFormData(prev => ({
                                 ...prev,
                                 occupation: opt.value,
                                 ...(opt.value === "other" ? { otherOccupation: "" } : {})
                               }));
                               setShowProfessionDropdown(false);
                             }}
                           >
                             {opt.label}
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                  {formData.occupation === "other" && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Specify Profession</label>
                      <input
                        type="text"
                        name="otherOccupation"
                        placeholder="Please specify your profession"
                        value={formData.otherOccupation || ""}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.otherOccupation ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-text custom-dropdown-selected`}
                      />
                      {fieldErrors.otherOccupation && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.otherOccupation}</p>
                      )}
                    </div>
                  )}
                  {fieldErrors.occupation && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.occupation}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Years of Experience <span className="text-black">*</span></label>
                  <div className="relative" ref={experienceRef}>
                    <div
                      className={`w-full min-h-[40px] px-2 py-1 border ${fieldErrors.experience ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white flex items-center justify-between gap-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent placeholder-text`}
                      tabIndex={0}
                      onClick={() => setShowExperienceDropdown(true)}
                      style={{ cursor: 'text', position: 'relative' }}
                    >
                                             {formData.experience === "" && (
                         <span className="text-gray-400 select-none" style={{ fontSize: '12px', color: '#9ca3af' }}>Select Years of Experience</span>
                       )}
                                             {formData.experience !== "" && (
                         <span className="text-[#223258] select-none" style={{ fontSize: '12px' }}>
                           {formData.experience}
                         </span>
                       )}
                    </div>
                    {showExperienceDropdown && (
                      <div className="absolute z-10 left-0 right-0 bg-white border border-[#3771FE]/50 rounded-b-[5px] shadow-lg max-h-48 overflow-y-auto mt-1">
                        {experienceOptions.filter(opt => opt.value !== formData.experience).map(opt => (
                           <div
                             key={opt.value}
                             className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer"
                             style={{ fontSize: '12px', color: '#223258' }}
                             onClick={() => {
                               setFormData(prev => ({
                                 ...prev,
                                 experience: opt.value
                               }));
                               setShowExperienceDropdown(false);
                             }}
                           >
                             {opt.label}
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                  {fieldErrors.experience && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.experience}</p>
                  )}
                </div>
              </div>

              {/* Place of Work and Name of your Institution in one row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Place of Work <span className="text-black">*</span></label>
                  <div className="relative" ref={placeOfWorkRef}>
                    <div
                      className={`w-full min-h-[40px] px-2 py-1 border ${fieldErrors.placeOfWork ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white flex items-center justify-between gap-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent placeholder-text`}
                      tabIndex={0}
                      onClick={() => setShowPlaceOfWorkDropdown(true)}
                      style={{ cursor: 'text', position: 'relative' }}
                    >
                                             {formData.placeOfWork === "" && (
                         <span className="text-gray-400 select-none" style={{ fontSize: '12px', color: '#9ca3af' }}>Select Place of Work</span>
                       )}
                                             {formData.placeOfWork !== "" && (
                         <span className="text-[#223258] select-none" style={{ fontSize: '12px' }}>
                           {formData.placeOfWork === "other" ? formData.otherPlaceOfWork : formData.placeOfWork.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                         </span>
                       )}
                    </div>
                    {showPlaceOfWorkDropdown && (
                      <div className="absolute z-10 left-0 right-0 bg-white border border-[#3771FE]/50 rounded-b-[5px] shadow-lg max-h-48 overflow-y-auto mt-1">
                        {placeOfWorkOptions.filter(opt => opt.value !== formData.placeOfWork).map(opt => (
                           <div
                             key={opt.value}
                             className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer"
                             style={{ fontSize: '12px', color: '#223258' }}
                             onClick={() => {
                               setFormData(prev => ({
                                 ...prev,
                                 placeOfWork: opt.value,
                                 ...(opt.value === "other" ? { otherPlaceOfWork: "" } : {})
                               }));
                               setShowPlaceOfWorkDropdown(false);
                             }}
                           >
                             {opt.label}
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                  {formData.placeOfWork === "other" && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Specify Place of Work</label>
                      <input
                        type="text"
                        name="otherPlaceOfWork"
                        placeholder="Please specify your place of work"
                        value={formData.otherPlaceOfWork || ""}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.otherPlaceOfWork ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-text custom-dropdown-selected`}
                      />
                      {fieldErrors.otherPlaceOfWork && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.otherPlaceOfWork}</p>
                      )}
                    </div>
                  )}
                  {fieldErrors.placeOfWork && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.placeOfWork}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Institution</label>
                  <input
                    type="text"
                    name="institution"
                    placeholder="Name of your Institution"
                    value={formData.institution}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.institution ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-text custom-dropdown-selected`}
                  />
                  {fieldErrors.institution && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.institution}</p>
                  )}
                </div>
              </div>

              {/* Add Specialties field before Address */}
              <div>
                <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Specialties <span className="text-black">*</span></label>
                <div className="relative" ref={specialtiesRef}>
                  <div
                    className={`w-full min-h-[40px] px-2 py-1 border ${fieldErrors.specialties ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white flex flex-wrap items-center gap-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent placeholder-text`}
                    tabIndex={0}
                    onClick={() => setShowSpecialtiesDropdown(true)}
                    style={{ cursor: 'text', position: 'relative' }}
                  >
                    {formData.specialties.length === 0 && (
                      <span className="text-gray-400 select-none" style={{ fontSize: '12px', color: '#9ca3af' }}>Select Specialties</span>
                    )}
                    {formData.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-[#C6D7FF]/50 text-[#223258] border border-[#3771FE]/50 mr-1 mt-1"
                      >
                        {specialty === "other" ? "Other" : specialty.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setFormData(prev => ({
                              ...prev,
                              specialties: prev.specialties.filter(s => s !== specialty)
                            }));
                          }}
                          className="ml-1 text-[#3771FE] hover:text-[#223258]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="flex-1 outline-none border-none bg-transparent text-sm min-w-[40px]"
                      style={{ padding: 0, margin: 0, minWidth: 0 }}
                      onFocus={() => setShowSpecialtiesDropdown(true)}
                      readOnly
                    />
                  </div>
                  {showSpecialtiesDropdown && (
                    <div className="absolute z-10 left-0 right-0 bg-white border border-[#3771FE]/50 rounded-b-[5px] shadow-lg max-h-48 overflow-y-auto mt-1">
                      {/* Search input for specialties */}
                      <div className="sticky top-0 bg-white border-b border-[#3771FE]/50 p-2">
                        <input
                          type="text"
                          placeholder="Search specialties..."
                          value={specialtiesSearchTerm}
                          className="w-full px-3 py-2 border border-[#3771FE]/50 rounded-[6px] text-sm text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3771FE] focus:border-transparent"
                          onChange={(e) => {
                            setSpecialtiesSearchTerm(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setShowSpecialtiesDropdown(false);
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      {specialtiesOptions
                        .filter(opt => !formData.specialties.includes(opt.value))
                        .filter(opt => opt.label.toLowerCase().includes(specialtiesSearchTerm.toLowerCase()))
                        .map(opt => (
                        <div
                          key={opt.value}
                          className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer"
                          style={{ fontSize: '12px', color: '#223258' }}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              specialties: [...prev.specialties, opt.value]
                            }));
                            setShowSpecialtiesDropdown(false);
                            setSpecialtiesSearchTerm('');
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {fieldErrors.specialties && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.specialties}</p>
                )}
                {formData.specialties.includes("other") && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Specify Other Specialty</label>
                    <input
                      type="text"
                      name="otherSpecialty"
                      placeholder="Please specify your specialty"
                      value={formData.otherSpecialty || ""}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.otherSpecialty ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-text custom-dropdown-selected`}
                    />
                    {fieldErrors.otherSpecialty && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.otherSpecialty}</p>
                    )}
                  </div>
                )}
              </div>



              <div>
                <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Country <span className="text-black">*</span></label>
                <div className="relative" ref={countryRef}>
                  <div
                    className={`w-full min-h-[40px] px-2 py-1 border ${fieldErrors.country ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white flex items-center justify-between gap-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent placeholder-text`}
                    tabIndex={0}
                    onClick={() => setShowCountryDropdown(true)}
                    style={{ cursor: 'text', position: 'relative' }}
                  >
                    {formData.country === "" && (
                      <span className="text-gray-400 select-none" style={{ fontSize: '12px', color: '#9ca3af' }}>Select Country</span>
                    )}
                    {formData.country !== "" && (
                      <span className="text-[#223258] select-none" style={{ fontSize: '12px' }}>
                        {formData.country.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                      </span>
                    )}
                  </div>
                  {showCountryDropdown && (
                    <div className="absolute z-10 left-0 right-0 bg-white border border-[#3771FE]/50 rounded-b-[5px] shadow-lg max-h-48 overflow-y-auto mt-1">
                      {/* Search input for countries */}
                      <div className="sticky top-0 bg-white border-b border-[#3771FE]/50 p-2">
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={countrySearchTerm}
                          className="w-full px-3 py-2 border border-[#3771FE]/50 rounded-[6px] text-sm text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3771FE] focus:border-transparent"
                          onChange={(e) => {
                            setCountrySearchTerm(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setShowCountryDropdown(false);
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      {Object.entries(countryOptions)
                        .filter(([value, label]) => label.toLowerCase().includes(countrySearchTerm.toLowerCase()))
                        .map(([value, label]) => (
                        <div
                          key={value}
                          className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer"
                          style={{ fontSize: '12px', color: '#223258' }}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              country: value,
                            }));
                            setShowCountryDropdown(false);
                            setCountrySearchTerm('');
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {fieldErrors.country && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.country}</p>
                )}
              </div>
              <div className="flex items-start space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="terms-agreement"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="mt-0.5 w-2 h-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      style={{ backgroundColor: !termsAgreed ? '#DEE8FF' : undefined, minWidth: '20px', minHeight: '20px' }}
                    />
                    <label htmlFor="terms-agreement" className="cursor-pointer" style={{ fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 400, color: '#000' }}>
                      I agree to the <a href="https://synduct.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-[#3771FE] transition-colors duration-200">Terms of Use</a> and <a href="https://synduct.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-[#3771FE] transition-colors duration-200">Privacy Policy</a>
                    </label>
              </div>
              {error && <div className="bg-red-50 text-red-600 p-2 rounded-[5px] text-sm">{error}</div>}



              <button
                onClick={handleCompleteRegistration}
                disabled={!formData.country || !formData.firstName || !formData.specialties.length || !formData.experience || !formData.placeOfWork || !formData.occupation || !termsAgreed}
                className={`w-full py-2 sm:py-2.5 px-4 rounded-[5px] font-dm-sans font-medium transition-colors duration-200 text-sm ${
                  formData.country && formData.firstName && formData.specialties.length && formData.experience && formData.placeOfWork && formData.occupation && termsAgreed
                    ? 'bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 hover:bg-[#C6D7FF]/60'
                    : 'bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 cursor-not-allowed opacity-50'
                }`}
              >
                {loading ? "Completing Registration..." : "Complete Registration"}
              </button>
            </div>
          </div>
        </div>
      </div>

  )
}
