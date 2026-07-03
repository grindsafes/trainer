import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

interface Contributor {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

function ContributorCircle({ contributor }: { contributor: Contributor }) {
  return (
    <a
      href={contributor.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2"
      title={contributor.login}
    >
      <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-border">
        <img
          src={contributor.avatar_url}
          alt={contributor.login}
          className="h-full w-full object-cover"
        />
      </div>
      <span className="max-w-20 truncate text-xs text-muted-foreground text-center">
        {contributor.login}
      </span>
    </a>
  );
}

function SkeletonCircle() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function Community() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.github.com/repos/grindsafes/preflop-trainer/contributors")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setContributors(data.slice(0, 20));
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
    <Helmet>
      <title>Community</title>
      <meta name="description" content="Join the GrindSafe community — a free, open-source poker trainer built by and for poker players. Learn, contribute, and master your ranges." />
      <meta property="og:title" content="Community" />
      <meta property="og:description" content="Join the GrindSafe community — a free, open-source poker trainer built by and for poker players." />
      <meta property="og:url" content="https://trainer.grindsafe.app/community" />
    </Helmet>
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="relative overflow-hidden text-white px-4 md:px-8 min-h-[30vh] md:min-h-[40vh] flex items-center justify-center text-center">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 py-6 md:py-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">Welcome to GrindSafe</h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto px-2">
            A community-driven trainer built by and for poker players.
            Create, study, and master your preflop ranges with interactive drills
            and detailed analytics.
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 md:px-8 py-6 md:py-10">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-8 md:space-y-12">
            <section>
              <h2 className="text-xl font-semibold mb-3">About Us</h2>
              <p className="text-muted-foreground max-w-3xl leading-relaxed">
                GrindSafe is a free, open-source tool created by poker players for poker players.
                Our mission is to make preflop range training accessible to everyone, regardless of skill
                level or budget. Whether you&apos;re grinding micro stakes or climbing the high-stakes
                ladder, building accurate preflop ranges is the foundation of a winning strategy.
              </p>
              <p className="text-muted-foreground max-w-3xl leading-relaxed mt-3">
                This project thrives on community contributions — from range charts and drill configurations
                to code improvements and feature ideas. Everyone is welcome to join, learn, and help build
                the best free poker training tool available.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-6">Contributors to the Project</h2>
              <div className="flex flex-wrap gap-6">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCircle key={i} />
                  ))
                ) : error ? (
                  <p className="text-muted-foreground text-sm">
                    Could not load contributors at this time.
                  </p>
                ) : contributors.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No contributors found.
                  </p>
                ) : (
                  contributors.map((c) => (
                    <ContributorCircle key={c.id} contributor={c} />
                  ))
                )}
              </div>
            </section>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-6">Frequently Asked Questions</h2>
            <Accordion type="multiple" className="w-full">
              {[
                {
                  id: "what-is",
                  question: "What is GrindSafe?",
                  answer:
                    "GrindSafe is a free, open-source poker training tool. It lets you build custom ranges using an interactive hand matrix and then drill those ranges with timed or untimed quizzes to build muscle memory.",
                },
                {
                  id: "create-range",
                  question: "How do I create a range?",
                  answer:
                    "Go to the Charts tab. You'll see a 13×13 hand matrix where each cell represents a starting hand. Click cells to assign actions (fold, call, raise, etc.). You can customize action colors and add notes. Ranges are saved automatically to your browser's local storage.",
                },
                {
                  id: "how-drills",
                  question: "How do drills work?",
                  answer:
                    "In the Trainer tab, select a drill or create a new one. A drill presents you with random hands from your saved ranges. For each hand, you choose the correct action. After answering, you get immediate feedback and can track your accuracy over time with the session grid.",
                },
                {
                  id: "export-import",
                  question: "Can I export my data?",
                  answer:
                    "Yes. Use the Export button in the top-right toolbar to download all your ranges and drills as a JSON file. You or others can then import that file using the Import button. This makes it easy to share ranges with friends or back up your work.",
                },
                {
                  id: "local-storage",
                  question: "Is my data stored locally?",
                  answer:
                    "Yes. All your ranges, drills, folders, and session history are saved in your browser's localStorage. Nothing is sent to any server. Clearing your browser data will erase your progress, so we recommend exporting regularly.",
                },
                {
                  id: "share-ranges",
                  question: "How do I share ranges with others?",
                  answer:
                    "Use the Export button to download a JSON file containing your ranges. Send that file to anyone else using GrindSafe. They can import it with the Import button and use your ranges in their own drills.",
                },
                {
                  id: "dark-mode",
                  question: "Does the app support dark mode?",
                  answer:
                    "Yes. Click the sun/moon icon in the top-right toolbar to toggle between light and dark themes. The setting persists across sessions.",
                },
                {
                  id: "open-source",
                  question: "Is this project open-source?",
                  answer:
                    "Absolutely. GrindSafe is open-source under the MIT license. You can find the source code, report issues, and contribute on GitHub at github.com/grindsafes/preflop-trainer.",
                },
                {
                  id: "unlimited",
                  question: "Are there any limits on charts or drills?",
                  answer:
                    "No. You can create unlimited ranges (charts) and unlimited drills completely free. There are no usage caps, no paywalls, and no subscription tiers. All features are available to all users.",
                },
              ].map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>
      </div>
    </div>
    </>
  );
}
