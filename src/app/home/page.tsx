export default function Home() {
  return (
    <div className="flex flex-col space-y-4">
      <button className="bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
        Start new session
      </button>
      <button className="bg-secondary text-white py-2 px-4 rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2">
        View Results
      </button>
      <button className="bg-accent text-white py-2 px-4 rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
        More
      </button>
    </div>
  );
}

