import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex flex-col">
      <main className="relative flex bg-black-3">
        
        <section className="flex min-h-screen flex-1 flex-col">
          <div className="mx-auto flex w-full flex-col">
            <div className="flex h-16 items-center justify-between md:hidden">
              <Image 
                src="/icons/logo.png"
                width={30}
                height={30}
                alt="menu icon"
              />
            </div>
            <div className="flex flex-col">
              {children}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}