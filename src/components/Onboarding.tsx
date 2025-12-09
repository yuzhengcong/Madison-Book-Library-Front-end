import { useState } from "react";
/**
 * Onboarding component
 *
 * Presents a two-step onboarding flow to obtain user consent and
 * collect anonymous demographic information. The component persists
 * consent and demographics to `/api/onboarding` and calls `onComplete`
 * when finished.
 */
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [consentGiven, setConsentGiven] = useState(false);
  const [occupation, setOccupation] = useState("");
  const [ageRange, setAgeRange] = useState("");

  const totalSteps = 2;

  const handleConsentContinue = () => {
    if (consentGiven) {
      // persist consent to backend
      try {
        fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "consent", consent: "accepted", ts: new Date().toISOString(), userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "" }),
        }).catch(() => {});
      } catch (e) {}

      setCurrentStep(2);
    }
  };

  const handleDemographicContinue = () => {
    // send demographics to backend before finishing
    try {
      fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "demographics", occupation, ageRange, ts: new Date().toISOString(), userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "" }),
      }).catch(() => {});
    } catch (e) {}

    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center bg-black/40 p-6 pt-16">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm overflow-hidden border border-zinc-200">
      {/* Stepper */}
        <div className="border-b bg-white/60">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              {[1, 2].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                        step === currentStep
                          ? "bg-blue-600 text-white"
                          : step < currentStep
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {step}
                    </div>
                    <span
                      className={`ml-3 text-sm ${
                        step === currentStep
                          ? "text-gray-900"
                          : "text-gray-500"
                      }`}
                    >
                      {step === 1 ? "Consent" : "About You"}
                    </span>
                  </div>
                  {step < totalSteps && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        step < currentStep ? "bg-green-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full max-w-4xl">
            {currentStep === 1 && (
              <div className="bg-white p-8">
                <h1 className="text-2xl text-gray-900 mb-6">
                  Welcome to the Madison Book Library Chatbot
                </h1>
                
                <div className="space-y-4 mb-6">
                  <p className="text-gray-700">
                    I'm designed to help you quickly find books, articles, events, and other resources available through the Madison Library. I've learned from librarians, cataloging standards, and trusted information sources across the Madison Library system to give you accurate and helpful guidance.
                  </p>
                  
                  <h2 className="text-lg text-gray-900 mt-6 mb-3">
                    Disclaimer
                  </h2>
                  
                  <p className="text-gray-700">
                    Before proceeding, please read and acknowledge the following:
                  </p>
                  
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>
                      This chat application is a helpful tool for discovering library materials, but it does not replace assistance from a professional librarian.
                    </li>
                    <li>
                      For detailed research help, account issues, or specialized inquiries, please contact a Madison Library staff member directly.
                    </li>
                    <li>
                      As with any AI tool, the information I provide may not be completely accurate or up-to-date.
                    </li>
                    <li>
                      The Madison Library is not responsible for any actions taken based on the information provided by this chatbot.
                    </li>
                    <li>
                      Questions and answers may be retained to improve this AI model. No private or personally identifying information is stored from your use of this tool.
                    </li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4">
                    By clicking &quot;I Understand and Agree&quot;, you acknowledge that you have read, understood, and agreed to these terms.
                  </p>
                </div>

                <div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Checkbox
                    id="consent"
                    checked={consentGiven}
                    onCheckedChange={(checked) => setConsentGiven(checked === true)}
                  />
                  <label
                    htmlFor="consent"
                    className="text-sm text-gray-900 cursor-pointer leading-relaxed"
                  >
                    I Understand and Agree
                  </label>
                </div>

                <Button
                  onClick={handleConsentContinue}
                  disabled={!consentGiven}
                  className={`w-full transition-colors ${consentGiven ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-sky-300"}`}
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="bg-white rounded-lg border p-8">
                <h1 className="text-2xl text-gray-900 mb-2">
                  Welcome to Madison Book Library
                </h1>
                <p className="text-gray-600 mb-8">
                  Before you begin, we'd like to collect some basic demographic
                  information to better serve our community. This information is
                  anonymous and helps us understand our users.
                </p>

                <div className="space-y-6 mb-8">
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">
                      Occupation / Role
                    </label>
                    <Select value={occupation} onValueChange={setOccupation}>
                      <SelectTrigger className="w-full bg-white border hover:bg-sky-50 hover:border-sky-300 transition-colors">
                        <SelectValue placeholder="Select your occupation" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="student" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">Student</SelectItem>
                        <SelectItem value="teacher" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">Teacher/Educator</SelectItem>
                        <SelectItem value="researcher" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">Researcher</SelectItem>
                        <SelectItem value="professional" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">Professional</SelectItem>
                        <SelectItem value="librarian" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">Librarian</SelectItem>
                        <SelectItem value="other" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">
                      Age Range
                    </label>
                    <Select value={ageRange} onValueChange={setAgeRange}>
                      <SelectTrigger className="w-full bg-white border hover:bg-sky-50 hover:border-sky-300 transition-colors">
                        <SelectValue placeholder="Select your age range" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Under 18" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">Under 18</SelectItem>
                        <SelectItem value="18-24" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">18-24</SelectItem>
                        <SelectItem value="25-34" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">25-34</SelectItem>
                        <SelectItem value="35-44" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">35-44</SelectItem>
                        <SelectItem value="45-54" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">45-54</SelectItem>
                        <SelectItem value="55-64" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">55-64</SelectItem>
                        <SelectItem value="65+" className="cursor-pointer data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-900">65+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                    <Button
                      onClick={handleDemographicContinue}
                      disabled={!occupation || !ageRange}
                      className={`w-full transition-colors ${occupation && ageRange ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-sky-300"}`}
                      size="lg"
                    >
                      Continue to Library
                    </Button>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}