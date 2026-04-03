import AccountProfile from "../../../components/forms/accountProfile";
import { currentUser } from "@clerk/nextjs/server";
import { fetchUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";
import Link from "next/link";

async function Page() {
    const cUser = await currentUser();
    if (!cUser) redirect("/");

    const userInfo = await fetchUser(cUser?.id || "");
    if (userInfo) redirect("/");

    const userData = {
        id: cUser?.id || "",
        objectId: "",
        name: cUser?.fullName || "",
        username: "",
        email: cUser?.primaryEmailAddress?.emailAddress || "",
        bio: "",
        image: cUser?.imageUrl || "",
    };

    return (
        <main className="relative z-10 h-screen w-full overflow-hidden glassmorphism-auth">
            <div className="mx-auto grid h-full w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6 lg:px-8 lg:py-6">
                <aside className="flex h-full w-full flex-col justify-between rounded-[24px] border border-white/10 bg-black/30 p-4 text-light-1 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-5 lg:p-6">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-light-3">Onboarding</p>
                        <h1 className="head-text mt-2 text-[34px] leading-tight lg:text-[38px]">Finish your profile</h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-light-2 lg:text-base">
                            Tell people who you are, what you build, and how they should recognize you across CollabWriter.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                            <p className="text-[15px] font-semibold text-light-1">Profile identity</p>
                            <p className="mt-1.5 text-[13px] leading-5 text-light-3">
                                Use your real name, a clear username, and a profile photo so collaborators can find you quickly.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                            <p className="text-[15px] font-semibold text-light-1">Bio and presence</p>
                            <p className="mt-1.5 text-[13px] leading-5 text-light-3">
                                Add a short bio that explains your work and makes your profile feel complete.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                            <p className="text-[15px] font-semibold text-light-1">One-time setup</p>
                            <p className="mt-1.5 text-[13px] leading-5 text-light-3">
                                You only need to do this once. After saving, you can jump straight into documents and code.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-[13px] leading-5 text-light-2">
                        This layout stays compact and centered so the full onboarding screen reads like a focused setup window.
                    </div>
                </aside>

                <section className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-black-2/90 p-4 shadow-2xl shadow-black/25 backdrop-blur-md sm:p-5 lg:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="head-text text-[32px] leading-tight lg:text-[36px]">Edit Profile</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-light-2 lg:text-base">
                                Set up your account before entering the workspace.
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="rounded-full border border-white/10 px-3.5 py-2 text-[13px] font-medium text-light-3 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-light-1"
                        >
                            Exit
                        </Link>
                    </div>

                    <div className="mt-4 flex-1 overflow-hidden rounded-[20px] border border-white/10 bg-black-3/80 p-4 sm:p-5 lg:p-6">
                        <AccountProfile user={userData} btnTitle="Save & Continue" />
                        <div className="mt-4 flex justify-center">
                            <Link href="/" className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#7f7f7f] transition-colors hover:bg-white/5 hover:text-light-1">
                                Exit without saving
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default Page;