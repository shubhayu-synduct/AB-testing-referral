"use client"

import { useEffect, useState, useRef } from "react";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'feedback'>('profile');
  const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const specialtiesRef = useRef<HTMLDivElement>(null);
  const placeOfWorkRef = useRef<HTMLDivElement>(null);
  const occupationRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);
  const [showPlaceOfWorkDropdown, setShowPlaceOfWorkDropdown] = useState(false);
  const [showOccupationDropdown, setShowOccupationDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Occupation and Specialties options
  const occupationOptions = [
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
  const specialtiesOptions = [
    { value: "cardiology", label: "Cardiology" },
    { value: "dermatology", label: "Dermatology" },
    { value: "endocrinology", label: "Endocrinology" },
    { value: "gastroenterology", label: "Gastroenterology" },
    { value: "hematology", label: "Hematology" },
    { value: "infectious-disease", label: "Infectious Disease" },
    { value: "nephrology", label: "Nephrology" },
    { value: "neurology", label: "Neurology" },
    { value: "oncology", label: "Oncology" },
    { value: "pulmonology", label: "Pulmonology" },
    { value: "rheumatology", label: "Rheumatology" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish
    if (!user) return; // Optionally redirect to login here

    const fetchProfile = async () => {
      const db = getFirebaseFirestore();
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        // Convert country value to match dropdown format if needed
        const country = docSnap.data().country || docSnap.data().profile?.country || 'united-states';
        const formattedCountry = country.toLowerCase().replace(/\s+/g, '-');
        
        setProfile({
          ...docSnap.data().profile || {},
          email: docSnap.data().email || user.email,
          country: formattedCountry
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, authLoading]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (specialtiesRef.current && event.target instanceof Node && !specialtiesRef.current.contains(event.target)) {
        setShowSpecialtiesDropdown(false);
      }
      if (placeOfWorkRef.current && event.target instanceof Node && !placeOfWorkRef.current.contains(event.target)) {
        setShowPlaceOfWorkDropdown(false);
      }
      if (occupationRef.current && event.target instanceof Node && !occupationRef.current.contains(event.target)) {
        setShowOccupationDropdown(false);
      }
      if (countryRef.current && event.target instanceof Node && !countryRef.current.contains(event.target)) {
        setShowCountryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSpecialtiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev: any) => ({ ...prev, specialties: e.target.value.split(",").map((s) => s.trim()) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    const auth = await getFirebaseAuth();
    const user = auth.currentUser;
    if (user) {
      const db = getFirebaseFirestore();
      const docRef = doc(db, "users", user.uid);
      // Update only the specified fields inside the 'profile' object using dot notation
      const { firstName, lastName, occupation, institution, specialties, placeOfWork, country, otherSpecialty, otherOccupation, otherPlaceOfWork } = profile;
      
      // Create update object with only defined values
      const updateData: any = {
        "profile.firstName": firstName,
        "profile.lastName": lastName,
        "profile.occupation": occupation,
        "profile.institution": institution,
        "profile.specialties": specialties,
        "profile.placeOfWork": placeOfWork,
        "profile.country": country,
        "profile.otherSpecialty": otherSpecialty || "",
        "profile.otherOccupation": otherOccupation || "",
        "profile.otherPlaceOfWork": otherPlaceOfWork || "",
        "country": country // Also update the top-level country field
      };
      
      await updateDoc(docRef, updateData);
      setSuccess(true);
    }
    setSaving(false);
  };

  const deleteProfile = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    
    setDeleting(true);
    try {
      const auth = await getFirebaseAuth();
      const user = auth.currentUser;
      if (user) {
        const db = getFirebaseFirestore();
        const docRef = doc(db, "users", user.uid);
        
        // Delete the user document from Firestore
        await deleteDoc(docRef);
        
        // Delete the user's authentication account
        await user.delete();
        
        // Sign out to clear authentication cookies
        await auth.signOut();
        
        // Reset local state
        setProfile(null);
        setShowDeleteModal(false);
        setDeleteConfirmation('');
        
        // Redirect to signup page
        window.location.href = '/signup';
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      // If there's an error, it might be because the user needs to re-authenticate
      // You might want to show a message asking them to sign in again
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) return <div className="flex justify-center items-center h-screen font-['DM_Sans']">Loading...</div>;
  if (!profile) return <div className="flex justify-center items-center h-screen font-['DM_Sans']">Profile not found.</div>;

  // Ensure specialties is always an array
  const specialtiesArray = Array.isArray(profile.specialties)
    ? profile.specialties
    : profile.specialties
      ? [profile.specialties]
      : [];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto mt-10 font-['DM_Sans'] px-4 md:px-8 w-full">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            className={`px-3 py-2 rounded-[8px] border text-base font-medium transition-colors min-w-[100px]
              ${activeTab === 'profile' ? 'border-[#223258] text-[#223258] bg-white' : 'border-[#AEAEAE] text-[#AEAEAE] bg-white'}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`px-3 py-2 rounded-[8px] border text-base font-medium transition-colors min-w-[100px]
              ${activeTab === 'subscription' ? 'border-[#223258] text-[#223258] bg-white' : 'border-[#AEAEAE] text-[#AEAEAE] bg-white'}`}
            onClick={() => setActiveTab('subscription')}
            disabled
          >
            Subscription
          </button>
          <button
            className={`px-3 py-2 rounded-[8px] border text-base font-medium transition-colors min-w-[100px]
              ${activeTab === 'feedback' ? 'border-[#223258] text-[#223258] bg-white' : 'border-[#AEAEAE] text-[#AEAEAE] bg-white'}`}
            onClick={() => setActiveTab('feedback')}
            disabled
          >
            Feedback
          </button>
        </div>

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-xl font-regular text-[#000000] mb-1">Account Settings</h2>
            <p className="text-[#747474] text-sm mb-6">Manage your personal information</p>
            <div className="border border-[#B5C9FC] rounded-[10px] p-4 md:p-8 bg-[#F4F7FF] w-full">
              <form className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-8 gap-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">First Name</label>
                  <input name="firstName" value={profile.firstName || ''} onChange={handleChange} className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]" />
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Last Name</label>
                  <input name="lastName" value={profile.lastName || ''} onChange={handleChange} className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]" />
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Email Address</label>
                  <input value={user?.email || ''} disabled className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none cursor-not-allowed opacity-60" />
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Country</label>
                  <div className="relative" ref={countryRef}>
                    <div
                      className={`w-full min-h-[40px] px-2 py-1 border border-[#B5C9FC] rounded-[8px] bg-white flex items-center justify-between gap-1 focus-within:ring-2 focus-within:ring-[#B5C9FC] focus-within:border-transparent`}
                      tabIndex={0}
                      onClick={() => setShowCountryDropdown(true)}
                      style={{ cursor: 'text', position: 'relative' }}
                    >
                      {!profile?.country && (
                        <span className="text-gray-400 select-none font-medium">Select Country</span>
                      )}
                      {profile?.country && (
                        <span className="text-[#223258] select-none font-medium">
                          {profile.country.split("-").map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                        </span>
                      )}
                      {/* Remove down arrow symbol */}
                    </div>
                    {showCountryDropdown && (
                      <div className="absolute z-10 left-0 right-0 bg-white border border-[#B5C9FC] rounded-b-[8px] shadow-lg max-h-48 overflow-y-auto mt-1">
                        {Object.entries({
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
                        }).map(([value, label]) => (
                          <div
                            key={value}
                            className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer"
                            style={{ fontSize: '12px', color: '#223258' }}
                            onClick={() => {
                              setProfile((prev: any) => ({ ...prev, country: value }));
                              setShowCountryDropdown(false);
                            }}
                          >
                            {label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Occupation</label>
                  <div className="relative" ref={occupationRef}>
                    <div
                      className={`w-full min-h-[40px] px-2 py-1 border border-[#B5C9FC] rounded-[8px] bg-white flex items-center justify-between gap-1 focus-within:ring-2 focus-within:ring-[#B5C9FC] focus-within:border-transparent`}
                      tabIndex={0}
                      onClick={() => setShowOccupationDropdown(true)}
                      style={{ cursor: 'text', position: 'relative' }}
                    >
                      {!profile?.occupation && (
                        <span className="text-gray-400 select-none font-medium">Select Occupation</span>
                      )}
                      {profile?.occupation && (
                        <span className="text-[#223258] select-none font-medium">
                          {profile.occupation === "other" ? "Other" : profile.occupation.split("-").map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                        </span>
                      )}
                      {/* Remove down arrow symbol */}
                    </div>
                    {showOccupationDropdown && (
                      <div className="absolute z-10 left-0 right-0 bg-white border border-[#B5C9FC] rounded-b-[8px] shadow-lg max-h-48 overflow-y-auto mt-1">
                        {occupationOptions.filter(opt => opt.value !== profile?.occupation).map(opt => (
                          <div
                            key={opt.value}
                            className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer"
                            style={{ fontSize: '12px', color: '#223258' }}
                            onClick={() => {
                              setProfile((prev: any) => ({ 
                                ...prev, 
                                occupation: opt.value,
                                otherOccupation: opt.value === "other" ? "" : ""
                              }));
                              setShowOccupationDropdown(false);
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {profile?.occupation === "other" && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-black mb-1">Specify Other Occupation</label>
                      <input
                        type="text"
                        name="otherOccupation"
                        placeholder="Please specify your occupation"
                        value={profile.otherOccupation || ""}
                        onChange={e => setProfile((prev: any) => ({ ...prev, otherOccupation: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#B5C9FC] rounded-[8px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B5C9FC] focus:border-transparent text-sm bg-white"
                        style={{ fontSize: 14 }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Place of Work</label>
                  <div className="relative" ref={placeOfWorkRef}>
                    <div
                      className={`w-full min-h-[40px] px-2 py-1 border border-[#B5C9FC] rounded-[8px] bg-white flex items-center justify-between gap-1 focus-within:ring-2 focus-within:ring-[#B5C9FC] focus-within:border-transparent`}
                      tabIndex={0}
                      onClick={() => setShowPlaceOfWorkDropdown(true)}
                      style={{ cursor: 'text', position: 'relative' }}
                    >
                      {!profile?.placeOfWork && (
                        <span className="text-gray-400 select-none font-medium">Select Place of Work</span>
                      )}
                      {profile?.placeOfWork && (
                        <span className="text-[#223258] select-none font-medium">
                          {profile.placeOfWork === "other" ? "Other" : profile.placeOfWork.split("-").map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                        </span>
                      )}
                      {/* Remove down arrow symbol */}
                    </div>
                    {showPlaceOfWorkDropdown && (
                      <div className="absolute z-10 left-0 right-0 bg-white border border-[#B5C9FC] rounded-b-[8px] shadow-lg max-h-48 overflow-y-auto mt-1">
                        {[
                          { value: "hospital-clinic", label: "Hospital/Clinic" },
                          { value: "outpatient-clinic", label: "Outpatient Clinic" },
                          { value: "private-practice", label: "Private Practice" },
                          { value: "university", label: "University" },
                          { value: "other", label: "Other" }
                        ].filter(opt => opt.value !== profile?.placeOfWork).map(opt => (
                          <div
                            key={opt.value}
                            className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer"
                            style={{ fontSize: '12px', color: '#223258' }}
                            onClick={() => {
                              setProfile((prev: any) => ({ 
                                ...prev, 
                                placeOfWork: opt.value,
                                otherPlaceOfWork: opt.value === "other" ? "" : ""
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
                  {profile?.placeOfWork === "other" && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-black mb-1">Specify Other Place of Work</label>
                      <input
                        type="text"
                        name="otherPlaceOfWork"
                        placeholder="Please specify your place of work"
                        value={profile.otherPlaceOfWork || ""}
                        onChange={e => setProfile((prev: any) => ({ ...prev, otherPlaceOfWork: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#B5C9FC] rounded-[8px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B5C9FC] focus:border-transparent text-sm bg-white"
                        style={{ fontSize: 14 }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Institution</label>
                  <input name="institution" value={profile.institution || ''} onChange={handleChange} className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]" />
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Specialties</label>
                  <div className="relative" ref={specialtiesRef}>
                    <div
                      className={`w-full min-h-[40px] px-2 py-1 border border-[#B5C9FC] rounded-[8px] bg-white flex flex-wrap items-center gap-1 focus-within:ring-2 focus-within:ring-[#B5C9FC] focus-within:border-transparent`}
                      tabIndex={0}
                      onClick={() => setShowSpecialtiesDropdown(true)}
                      style={{ cursor: 'text', position: 'relative' }}
                    >
                      {(!specialtiesArray || specialtiesArray.length === 0) && (
                        <span className="text-gray-400 text-sm select-none font-medium">Select Specialties</span>
                      )}
                      {specialtiesArray.map((specialty: string) => (
                        <span
                          key={specialty}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-[#C6D7FF]/50 text-[#223258] border border-[#3771FE]/50 mr-1 mt-1"
                        >
                          {specialty === "other" ? "Other" : (specialtiesOptions.find(opt => opt.value === specialty)?.label || specialty)}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setProfile((prev: any) => {
                                const arr = Array.isArray(prev.specialties)
                                  ? prev.specialties
                                  : prev.specialties
                                    ? [prev.specialties]
                                    : [];
                                const newSpecialties = arr.filter((s: string) => s !== specialty);
                                
                                // If removing "other", clear otherSpecialty
                                // If "other" is not in remaining specialties, clear otherSpecialty
                                const shouldClearOtherSpecialty = specialty === "other" || !newSpecialties.includes("other");
                                return { 
                                  ...prev, 
                                  specialties: newSpecialties,
                                  otherSpecialty: shouldClearOtherSpecialty ? "" : prev.otherSpecialty
                                };
                              });
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
                        style={{ fontSize: 14, padding: 0, margin: 0, minWidth: 0 }}
                        onFocus={() => setShowSpecialtiesDropdown(true)}
                        readOnly
                      />
                    </div>
                    {showSpecialtiesDropdown && (
                      <div className="absolute z-10 left-0 right-0 bg-white border border-[#B5C9FC] rounded-b-[8px] shadow-lg max-h-48 overflow-y-auto mt-1">
                        {specialtiesOptions.filter(opt => !specialtiesArray.includes(opt.value)).map(opt => (
                          <div
                            key={opt.value}
                            className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer text-sm text-[#223258]"
                            onClick={() => {
                              setProfile((prev: any) => {
                                const arr = Array.isArray(prev.specialties)
                                  ? prev.specialties
                                  : prev.specialties
                                    ? [prev.specialties]
                                    : [];
                                const newSpecialties = [...arr, opt.value];
                                
                                // If adding "other", keep otherSpecialty as is
                                // If adding non-"other", clear otherSpecialty
                                return { 
                                  ...prev, 
                                  specialties: newSpecialties,
                                  otherSpecialty: opt.value === "other" ? (prev.otherSpecialty || "") : ""
                                };
                              });
                              setShowSpecialtiesDropdown(false);
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {specialtiesArray.includes("other") && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-black mb-1">Specify Other Specialty</label>
                      <input
                        type="text"
                        name="otherSpecialty"
                        placeholder="Please specify your specialty"
                        value={profile.otherSpecialty || ""}
                        onChange={e => setProfile((prev: any) => ({ ...prev, otherSpecialty: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#B5C9FC] rounded-[8px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B5C9FC] focus:border-transparent text-sm bg-white"
                        style={{ fontSize: 14 }}
                      />
                    </div>
                  )}
                </div>
                {success && <div className="md:col-span-2 font-medium text-right" style={{ color: '#8991AA' }}>Profile updated successfully!</div>}
              </form>
            </div>
            <div className="flex justify-end mt-6 w-full mb-4 md:mb-0">
              <button
                type="submit"
                disabled={saving}
                onClick={handleSubmit}
                className="bg-[#C6D7FF]/50 border border-[#3771FE]/50 text-[#223258] font-regular px-8 py-2 rounded-[8px] transition-colors text-lg w-48"
              >
                {saving ? 'Saving...' : 'Update profile'}
              </button>
            </div>
            <div className="flex justify-end mt-4 w-full mb-4 md:mb-0">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="bg-[#F4F7FF] border border-[#B5C9FC] text-[#747474] font-regular px-8 py-2 rounded-[8px] transition-colors text-lg w-48 hover:bg-[#E8F0FF] hover:text-[#223258]"
              >
                Delete Profile
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Profile Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[10px] p-6 max-w-md w-full border border-[#B5C9FC]">
            <div className="text-center mb-6">
              <h3 className="text-xl font-medium text-[#000000] mb-2">Delete Profile</h3>
              <p className="text-[#747474] text-sm leading-relaxed">
                We are sorry to see you go. This action will delete your profile and cannot be undone.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-[#000000] mb-2 font-medium text-sm">
                Type <span className="font-bold text-[#223258]">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC] text-center"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1 bg-[#F4F7FF] border border-[#B5C9FC] text-[#747474] font-medium px-4 py-2 rounded-[8px] transition-colors hover:bg-[#E8F0FF] hover:text-[#223258]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteProfile}
                disabled={deleteConfirmation !== 'DELETE' || deleting}
                className="flex-1 bg-[#F4F7FF] border border-[#B5C9FC] text-[#223258] font-medium px-4 py-2 rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E8F0FF] disabled:hover:bg-[#F4F7FF]"
              >
                {deleting ? 'Deleting...' : 'Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 