import React, { useState, useEffect } from 'react';

const LeaderboardView = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial fetch when the component loads
    useEffect(() => {
        fetchLeaderboard();
    }, []);

    // Fetch the legacy "Gold" statistic
    const fetchLeaderboard = () => {
        setIsLoading(true);
        const request = {
            StatisticName: "Gold",
            StartPosition: 0,
            MaxResultsCount: 100
        };

        // Note: Assuming PlayFabServerSDK is initialized in your app context
        window.PlayFabServerSDK.GetLeaderboard(request, (error, result) => {
            if (result !== null) {
                setLeaderboard(result.data.Leaderboard);
            } else {
                console.error("Error fetching leaderboard:", error);
            }
            setIsLoading(false);
        });
    };

    // ACTION: Wipe Gold
    const handleWipeGold = (playFabId, playerName) => {
        if (!window.confirm(`Are you sure you want to wipe all Gold for ${playerName}?`)) return;

        const request = {
            PlayFabId: playFabId,
            Statistics: [{
                StatisticName: "Gold",
                Value: 0
            }]
        };

        window.PlayFabServerSDK.UpdatePlayerStatistics(request, (error, result) => {
            if (result !== null) {
                alert(`${playerName}'s gold has been wiped to 0.`);
                fetchLeaderboard(); // Refresh the table automatically
            } else {
                console.error("Failed to wipe gold:", error);
                alert("Error: Could not wipe gold.");
            }
        });
    };

    // ACTION: Ban User
    const handleBanUser = (playFabId, playerName) => {
        if (!window.confirm(`CRITICAL: Ban ${playerName} from Easy Express?`)) return;

        const request = {
            Bans: [{
                PlayFabId: playFabId,
                Reason: "Suspicious Leaderboard Activity / Economy Manipulation",
                DurationInHours: 24 // 24-hour ban. Remove line for permanent.
            }]
        };

        window.PlayFabAdminSDK.BanUsers(request, (error, result) => {
            if (result !== null) {
                alert(`${playerName} has been banned for 24 hours.`);
                // Optionally remove them from the local state immediately
                setLeaderboard(prev => prev.filter(player => player.PlayFabId !== playFabId));
            } else {
                console.error("Failed to ban user:", error);
                alert("Error: Could not ban user.");
            }
        });
    };

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-gray-100 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">Easy Express - Gold Leaderboard</h1>
                    <button 
                        onClick={fetchLeaderboard}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-md transition-colors shadow-md"
                    >
                        Refresh Data
                    </button>
                </div>

                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-700 text-gray-300 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold">Rank</th>
                                <th className="p-4 font-semibold">Player Name</th>
                                <th className="p-4 font-semibold">PlayFab ID</th>
                                <th className="p-4 font-semibold text-right">Gold</th>
                                <th className="p-4 font-semibold text-center">Admin Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-400">Loading data...</td>
                                </tr>
                            ) : leaderboard.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-400">No players found on the leaderboard.</td>
                                </tr>
                            ) : (
                                leaderboard.map((player) => (
                                    <tr key={player.PlayFabId} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                                        <td className="p-4 text-gray-300 font-mono">{player.Position + 1}</td>
                                        <td className="p-4 font-medium text-white">{player.DisplayName || "Unknown Player"}</td>
                                        <td className="p-4 text-xs text-gray-500 font-mono">{player.PlayFabId}</td>
                                        <td className="p-4 text-right font-bold text-yellow-400">
                                            {player.StatValue.toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center space-x-3">
                                                <button 
                                                    onClick={() => handleWipeGold(player.PlayFabId, player.DisplayName || player.PlayFabId)}
                                                    className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-500 text-white py-1 px-3 rounded text-sm transition-colors"
                                                    title="Reset player's gold to 0"
                                                >
                                                    Wipe Gold
                                                </button>
                                                <button 
                                                    onClick={() => handleBanUser(player.PlayFabId, player.DisplayName || player.PlayFabId)}
                                                    className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white py-1 px-3 rounded text-sm transition-colors"
                                                    title="Ban player account"
                                                >   
                                                    Ban
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardView;