export default function PagePublique({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-stone-100 px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow">
        <div className="bg-encre px-6 py-4">
          <span className="text-lg font-extrabold tracking-widest text-white">
            CHEF <span className="text-rouge">MAYER</span>
          </span>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
