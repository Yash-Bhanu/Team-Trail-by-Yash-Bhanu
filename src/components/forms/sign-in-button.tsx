'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { toast } from 'sonner';

export function SignInButton() {
  const [loading, setLoading] = useState(false);

  const handleGitHubSignIn = async () => {
    try {
      setLoading(true);
      await signIn.social({
        provider: 'github',
        callbackURL: '/dashboard',
      });
    } catch {
      toast.error('Failed to initiate GitHub sign-in.');
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleGitHubSignIn} disabled={loading} className="w-full">
      <Github className="h-4 w-4" />
      {loading ? 'Redirecting to GitHub…' : 'Continue with GitHub'}
    </Button>
  );
}
