

// Protected layout with school theme loading
// Individual layouts (parent, school-admin, etc.) handle their own authentication
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}

    </>
  );
} 