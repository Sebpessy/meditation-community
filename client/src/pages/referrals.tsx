import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Share, Gift, Users, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReferralData {
  referralCode: string;
  referrals: Array<{
    id: number;
    referredId: number;
    status: string;
    createdAt: string;
    completedAt?: string;
  }>;
  quantumLove: {
    points: number;
    transactions: Array<{
      id: number;
      amount: number;
      type: string;
      description: string;
      createdAt: string;
    }>;
  };
}

export default function ReferralsPage() {
  const [user] = useAuthState(auth);
  const [, setLocation] = useLocation();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
      return;
    }

    const fetchUserAndReferralData = async () => {
      try {
        // Get current user ID
        const userResponse = await apiRequest("GET", `/api/auth/user/${user.uid}`);
        if (!userResponse.ok) {
          throw new Error("User not found");
        }
        const userData = await userResponse.json();
        setCurrentUserId(userData.id);

        // Fetch referral data
        const [codeResponse, referralsResponse, quantumResponse] = await Promise.all([
          apiRequest("GET", `/api/user/${userData.id}/referral-code`),
          apiRequest("GET", `/api/user/${userData.id}/referrals`),
          apiRequest("GET", `/api/user/${userData.id}/quantum-love`)
        ]);

        const [codeData, referralsData, quantumData] = await Promise.all([
          codeResponse.json(),
          referralsResponse.json(),
          quantumResponse.json()
        ]);

        setReferralData({
          referralCode: codeData.referralCode,
          referrals: referralsData.referrals,
          quantumLove: quantumData
        });
      } catch (error) {
        console.error("Failed to fetch referral data:", error);
        toast({
          title: "Error",
          description: "Failed to load referral data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndReferralData();
  }, [user, setLocation, toast]);

  const copyReferralLink = () => {
    if (!referralData) return;
    
    const referralLink = `${window.location.origin}?ref=${referralData.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard"
    });
  };

  const shareReferralLink = async () => {
    if (!referralData) return;
    
    const referralLink = `${window.location.origin}?ref=${referralData.referralCode}`;
    const text = `Join me on Serene Space for daily meditation! Use my referral code: ${referralData.referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Serene Space",
          text: text,
          url: referralLink
        });
      } catch (error) {
        // Fallback to copy
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!referralData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <Sparkles className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-white mb-2">
              Unable to Load Referrals
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300">
              There was an error loading your referral data. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-800 dark:text-white mb-2">
              Share the Love ✨
            </h1>
            <p className="text-neutral-600 dark:text-neutral-300">
              Invite friends to Serene Space and earn Quantum Love points together
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Referral Link Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share className="w-5 h-5" />
                  Your Referral Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    Referral Code:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono font-bold text-primary bg-white dark:bg-neutral-700 px-3 py-1 rounded border">
                      {referralData.referralCode}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyReferralLink}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button onClick={shareReferralLink} className="w-full">
                  <Share className="w-4 h-4 mr-2" />
                  Share Link
                </Button>
                
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  <p className="font-semibold mb-1">How it works:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Share your code with friends</li>
                    <li>• They get 50 points when they join</li>
                    <li>• You get 100 points when they complete their first meditation</li>
                    <li>• They get an extra 25 points for completing their first session</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Quantum Love Points Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Quantum Love Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {referralData.quantumLove.points}
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Total Points Earned
                  </p>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {referralData.quantumLove.transactions.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      No transactions yet. Start referring friends to earn points!
                    </p>
                  ) : (
                    referralData.quantumLove.transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                        <div>
                          <p className="text-sm font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={transaction.amount > 0 ? "default" : "secondary"}>
                          {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referrals List */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Your Referrals ({referralData.referrals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referralData.referrals.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">
                    No referrals yet. Share your code to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referralData.referrals.map((referral) => (
                    <div key={referral.id} className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <div>
                        <p className="font-medium">User #{referral.referredId}</p>
                        <p className="text-sm text-neutral-500">
                          Joined: {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                        {referral.completedAt && (
                          <p className="text-sm text-neutral-500">
                            Completed: {new Date(referral.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant={referral.status === "completed" ? "default" : "secondary"}>
                        {referral.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}