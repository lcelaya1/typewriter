export default function DocLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#FAFAFA]">
      {children}
    </div>
  )
}
