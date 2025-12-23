import Link from 'next/link'; // <--- Make sure this is added at the top of your file!

function StatusCard({ status, title, id, date, quantity, color, jobId }: any) {
  const colors: any = {
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };
  
  // We clean up the ID to look nice, but we use the REAL jobId for the link
  const displayId = id.replace('#', ''); 

  return (
    <Link href={`/dashboard/jobs/${jobId}`}>
      <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-black hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${colors[color] || colors.blue}`}>
            {status}
          </div>
          <span className="text-xs font-mono text-gray-400 group-hover:text-black transition-colors">#{displayId}</span>
        </div>
        <h4 className="mt-4 text-lg font-bold text-gray-900 truncate">{title}</h4>
        <div className="mt-1 flex items-center text-sm text-gray-500">
          <span className="font-medium text-gray-900 mr-1">{quantity}</span> units
        </div>
        <div className="mt-4 flex items-center text-xs text-gray-400 border-t border-gray-50 pt-3">
          <Clock size={12} className="mr-1.5" />
          Submitted {date}
        </div>
      </div>
    </Link>
  );
}
