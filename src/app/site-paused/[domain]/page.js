import { query } from "@/lib/db";

export default async function SitePausedPage({ params }) {
  const { domain } = params;
  
  // Check if site exists but is unpublished
  const { rows } = await query(
    `SELECT s.*, u.email as owner_email
     FROM sites s
     LEFT JOIN users u ON s.owner_id = u.id
     WHERE s.custom_domain = $1 
        OR s.subdomain = $1
     LIMIT 1`,
    [domain]
  );
  
  const site = rows[0];
  const isUnpublished = site && site.status === "draft" && site.unpublish_reason;
  
  if (!isUnpublished) {
    return null; // Let normal 404 handling take over
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="rounded-full bg-amber-500/10 border border-amber-400/30 w-20 h-20 mx-auto flex items-center justify-center">
          <svg className="w-10 h-10 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Site Temporarily Paused
          </h1>
          <p className="text-blue-100/85">
            This website is temporarily unavailable due to a payment issue.
          </p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-3">
          <p className="text-sm text-blue-200/90">
            <strong className="text-white">To the site owner:</strong>
          </p>
          <p className="text-sm text-blue-200/80">
            Your website has been paused because a recent payment could not be processed. To restore your site:
          </p>
          <ol className="text-sm text-blue-200/80 space-y-2 list-decimal list-inside">
            <li>Update your payment method in your account</li>
            <li>Ensure your subscription is active</li>
            <li>Contact support if you need help</li>
          </ol>
        </div>
        
        <div className="space-y-3">
          <a
            href="/login"
            className="block w-full rounded-full bg-cyan-500/20 border border-cyan-400/40 px-6 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 transition"
          >
            Sign in to restore site
          </a>
          
          <p className="text-xs text-blue-200/60">
            Need help? Email{" "}
            <a href="mailto:hello@technonaire.com" className="text-cyan-300 hover:underline">
              hello@technonaire.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
