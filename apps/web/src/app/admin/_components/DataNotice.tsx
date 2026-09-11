interface DataNoticeProps {
  message: string;
}

export function DataNotice({ message }: DataNoticeProps) {
  return (
    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Dados temporariamente indisponíveis</p>
      <p className="mt-1 text-amber-800">{message}</p>
    </div>
  );
}
