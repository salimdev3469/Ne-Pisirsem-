import dynamic from 'next/dynamic';

const AdminClient = dynamic(() => import('@/components/admin-client'), {
  ssr: false
});

export default function AdminRoutePage() {
  return <AdminClient />;
}
