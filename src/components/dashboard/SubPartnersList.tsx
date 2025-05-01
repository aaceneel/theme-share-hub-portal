import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubPartner {
  id: string;
  username: string;
  totalClicks: number;
  bonusClicksEarned: number;
}

interface SubPartnersListProps {
  partnerCode: string;
  limit?: number;
}

const SubPartnersList = ({ partnerCode, limit = 5 }: SubPartnersListProps) => {
  const [subPartners, setSubPartners] = useState<SubPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubPartners = async () => {
      try {
        // First get list of users that have referred_by matching this partner code
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username')
          .eq('referred_by', partnerCode)
          .order('joined_at', { ascending: false })
          .limit(limit);

        if (usersError) throw usersError;
        
        if (!usersData || usersData.length === 0) {
          setSubPartners([]);
          setIsLoading(false);
          return;
        }
        
        // For each sub-partner, get their clicks count and bonus clicks they generated
        const subPartnersWithStats = await Promise.all(
          usersData.map(async (user) => {
            // Get total clicks by this sub-partner
            const { count: directClicksCount, error: directClicksError } = await supabase
              .from('clicks')
              .select('*', { count: 'exact', head: false })
              .eq('user_id', user.id)
              .eq('type', 'direct');
              
            if (directClicksError) throw directClicksError;
            
            // Get bonus clicks this partner received from this sub-partner
            const { count: bonusClicksCount, error: bonusClicksError } = await supabase
              .from('clicks')
              .select('*', { count: 'exact', head: false })
              .eq('user_id', user.id)
              .eq('type', 'bonus');
              
            if (bonusClicksError) throw bonusClicksError;
            
            const totalClicks = directClicksCount || 0;
            const bonusClicksEarned = Math.round(totalClicks * 0.2); // 20% of sub-partner's clicks
            
            return {
              id: user.id,
              username: user.username,
              totalClicks,
              bonusClicksEarned
            };
          })
        );
        
        setSubPartners(subPartnersWithStats);
      } catch (error) {
        console.error('Error fetching sub-partners:', error);
        setSubPartners([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubPartners();
  }, [partnerCode, limit]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin h-8 w-8 border-4 border-partner-purple border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">Your Sub-Partners</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="py-3 text-left font-medium text-gray-500">Username</th>
              <th className="py-3 text-right font-medium text-gray-500">Total Clicks</th>
              <th className="py-3 text-right font-medium text-gray-500">Bonus Clicks Earned</th>
            </tr>
          </thead>
          <tbody>
            {subPartners.length > 0 ? (
              subPartners.map((partner) => (
                <tr key={partner.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 font-medium">@{partner.username}</td>
                  <td className="py-4 text-right">{partner.totalClicks.toLocaleString()}</td>
                  <td className="py-4 text-right">{partner.bonusClicksEarned.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-500">
                  No sub-partners yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {subPartners.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          <p>You earn 20% of all clicks from your sub-partners.</p>
        </div>
      )}
    </div>
  );
};

export default SubPartnersList;
