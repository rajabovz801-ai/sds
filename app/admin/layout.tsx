import '../student-route-styles.css';
import './compact.css';
import './premium-final.css';
import './premium-portals.css';

// Admin presentation layers are isolated to this route.
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
