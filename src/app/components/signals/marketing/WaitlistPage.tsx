export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-bold mb-6">MULUK</h1>

      <p className="text-lg text-center max-w-xl mb-8 opacity-80">
        The platform they were afraid to build.  
        Private. Invite only.
      </p>

      <form className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <input
          type="email"
          placeholder="Enter your email"
          className="flex-1 px-4 py-3 rounded bg-neutral-900 border border-neutral-700"
        />
        <button className="px-6 py-3 bg-white text-black rounded">
          Join Waitlist
        </button>
      </form>
    </main>
  );
}