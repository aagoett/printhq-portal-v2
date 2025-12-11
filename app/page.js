// app/page.js
import { redirect } from 'next/navigation';

export default function Home() {
  // If you want to go straight to the dashboard instead, change '/auth' to '/dashboard'
  redirect('/auth');
}
