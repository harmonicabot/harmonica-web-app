import "./welcome.module.css";

export default function Intro() {

  return (
    <div className="flex p-32 min-w-10 items-center justify-center text-center bg-amber-50 text-black rounded-md border-2 border-gray-200 space-x-4">
      <div className="">
        <div>
          <h1 className="title fontFreight">
            Let's get you started!
          </h1>
          <p className="transition-colors">
            We'll start with some basics
          </p>
          <div className="text-left" >
            <p>What should we call you</p>
            <input type="text" className="border-2 border-gray-200 bg-[#fafaf9] rounded-md p-2 ml-0"/>
          </div>
          <button className="">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
