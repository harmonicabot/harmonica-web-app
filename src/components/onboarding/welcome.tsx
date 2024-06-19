import Link from 'next/link';
import './welcome.module.css';

import { useState, useEffect } from 'react';

export default function Intro() {
  const [step, setStep] = useState(1);
  const [value, setValue] = useState({});

  const arrowBack = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M15 8a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 7.5H14.5a.5.5 0 0 1 .5.5z" />
  </svg>;
  
  const arrowForward = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5H13.293l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 1 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
  </svg>;

  const previousStep = () => {
    setStep(step - 1);
  };

  const nextStep = () => {
    setStep(step + 1);
    console.log("Current Values: ", value);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        nextStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nextStep]);

  return (
    <div id="onboarding" className="flex min-w-10 items-center justify-center text-center bg-amber-50 text-black rounded-md border-2 border-gray-200 space-x-4 w-2/3 h-[50dvh] m-auto relative">
      <div>
        {step === 1 && (
          <>
            <h1 className="title font-bold text-3xl">Let's get you started!</h1>
            <p className="transition-colors mb-8">
              We'll start with some basics
            </p>
            <div className="text-left">
              <p>What should we call you?</p>
              <input
                id="userName"
                type="text"
                value={value['userName']}
                onChange={(e) =>
                  setValue({ ...value, [e.target.id]: e.target.value })
                }
                className="border-2 border-gray-200 bg-[#fafaf9] rounded-md p-2 ml-0 w-full mb-4"
              />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="title font-bold text-3xl">
              Welcome {value['userName']}. Where do you work?
            </h1>
            <div className="transition-colors">
              <div>
                <p>What's the name of your org?</p>
                <input
                  type="text"
                  value={value['orgName']}
                  onChange={(e) =>
                    setValue({ ...value, orgName: e.target.value })
                  }
                  className="border-2 border-gray-200 bg-[#fafaf9] rounded-md p-2 ml-0 w-full mb-4"
                />
              </div>
            </div>
          </>
        )}

      </div>
      {step > 1 && (
        <button
          className="absolute bottom-0 left-0 m-4 p-2 bg-[#000] text-white rounded-md"
          onClick={previousStep}
        >
          {arrowBack}
        </button>
      )}

        <button
          className="absolute bottom-0 right-5 m-4 p-2 bg-[#000] text-white rounded-md"
          onClick={nextStep}
      >
        {step < 2 ? (
          arrowForward
        ) : (
          <Link href="">Finish</Link>
        )}
      </button>
    </div>
  );
}
