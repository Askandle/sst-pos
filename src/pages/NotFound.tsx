import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";

export default function NotFound() {
  return (
    <>
      <PageMeta title="Page Not Found" description="" />
      <div className="relative flex flex-col items-center justify-center min-h-[75vh] p-6 overflow-hidden">
        <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
          <h1 className="mb-6 font-bold text-foreground text-3xl xl:text-4xl">
            404 ERROR
          </h1>

          <img
            src="/images/error/404.svg"
            alt="404"
            className="dark:hidden w-full max-w-sm mx-auto mb-6"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <img
            src="/images/error/404-dark.svg"
            alt="404"
            className="hidden dark:block w-full max-w-sm mx-auto mb-6"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />

          <p className="mt-4 mb-6 text-base text-muted-foreground sm:text-lg">
            The page may have been moved or does not exist. Please check the
            URL or return to dashboard.
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium text-foreground shadow-xs hover:bg-muted transition-colors"
          >
            Back to home
          </Link>
        </div>
        <p className="mt-8 text-xs text-center text-muted-foreground">
          &copy; {new Date().getFullYear()} NetPOS Internet Cafe
        </p>
      </div>
    </>
  );
}
