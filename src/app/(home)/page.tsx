import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center text-center p-8 max-w-4xl mx-auto">
      <h1 className="mb-6 text-4xl font-bold">InfiniRewards</h1>
      <p className="text-xl mb-8">
        A revolutionary platform that transforms tokens into functional tools with embedded utility.
      </p>
      <div className="mb-12 text-fd-muted-foreground max-w-2xl mx-auto">
        <p className="mb-4">
          InfiniRewards introduces the concept of "Token with Utility" - adding programmable logic to 
          both fungible (ERC20) and non-fungible (ERC1155) tokens on StarkNet.
        </p>
        <p>
          By defining logic at the token level, we create a more flexible, extensible rewards 
          ecosystem that empowers merchants to craft unique experiences.
        </p>
      </div>
      <div className="flex justify-center gap-4">
        <Link
          href="/docs"
          className="bg-fd-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition-all"
        >
          View Documentation
        </Link>
        <Link
          href="/docs/guides/onboarding"
          className="border border-fd-primary text-fd-primary px-6 py-3 rounded-md font-semibold hover:bg-fd-primary hover:text-white transition-all"
        >
          Merchant Onboarding
        </Link>
      </div>
    </main>
  );
}
