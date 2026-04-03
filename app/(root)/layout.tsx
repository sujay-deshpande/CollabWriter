import LeftSideBar from "@/components/shared/leftSideBar";
import Image from "next/image";
import MobileNav from "@/components/shared/mobileNav";
import { currentUser } from "@clerk/nextjs/server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();

  if (!user) {
    return <div className="min-h-screen bg-black-3">{children}</div>;
  }

  return (
    <div className="relative flex flex-col">
      <main className="relative flex h-screen overflow-hidden bg-black-3">
        <LeftSideBar />
        
        <section className="flex min-h-screen flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-5xl flex-col px-4 sm:px-14 max-sm:px-4">
            <div className="flex h-16 items-center justify-between md:hidden">
              <Image 
                src="/icons/logo.png"
                width={30}
                height={30}
                alt="menu icon"
              />
              <MobileNav />
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