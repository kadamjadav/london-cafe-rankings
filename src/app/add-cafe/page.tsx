import type { Metadata } from "next";
import AddCafeForm from "@/components/AddCafeForm";

export const metadata: Metadata = { title: "Add a café" };

export default function AddCafePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Add a café</h1>
      <p className="mt-2 text-stone-600">
        Know a London café that isn&apos;t on the site? Add it here. Anyone can then review it and join the conversation.
      </p>
      <div className="mt-8">
        <AddCafeForm />
      </div>
    </main>
  );
}
