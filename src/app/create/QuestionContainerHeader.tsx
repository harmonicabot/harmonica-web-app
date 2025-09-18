export function QuestionContainerHeader() {
  return (
    <div className="space-y-4 mb-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Before we launch your session...</h2>
        <p className="text-gray-600">
          We need to know what basic information to collect from participants (like name, email, role). 
          Your actual session questions are already created!
        </p>
      </div>
      
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">What information do you want participants to share?</h3>
        <p className="text-sm text-gray-600">
          This information can be used to identify responses in your results.
        </p>
      </div>
    </div>
  );
} 