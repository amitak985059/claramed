import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

const VideoCallWindow = ({ appointmentId, currentUserName, onClose }) => {
    // Generate a unique room name based on the appointment ID
    const roomName = `Claramed_Consultation_${appointmentId}`;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col">
            <div className="flex justify-between items-center bg-gray-900 text-white px-4 py-3 border-b border-gray-800">
                <div className="font-semibold text-lg flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    Secure Video Consultation
                </div>
                <button 
                    onClick={onClose} 
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-1.5 rounded-full text-sm font-medium transition-colors"
                >
                    Leave Call
                </button>
            </div>
            <div className="flex-1 w-full bg-black relative">
                <JitsiMeeting
                    domain="meet.jit.si"
                    roomName={roomName}
                    configOverwrite={{
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        disableModeratorIndicator: true,
                        prejoinPageEnabled: false,
                        enableEmailInStats: false,
                    }}
                    interfaceConfigOverwrite={{
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                        SHOW_CHROME_EXTENSION_BANNER: false,
                    }}
                    userInfo={{
                        displayName: currentUserName,
                    }}
                    onApiReady={(externalApi) => {
                        // Close our window when user leaves the Jitsi call natively
                        externalApi.addListener('videoConferenceLeft', () => {
                            onClose();
                        });
                    }}
                    getIFrameRef={(iframeRef) => {
                        iframeRef.style.height = '100%';
                        iframeRef.style.width = '100%';
                    }}
                />
            </div>
        </div>
    );
};

export default VideoCallWindow;
