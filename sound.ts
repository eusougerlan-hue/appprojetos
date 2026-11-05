/**
 * Utilitário de Alerta Sonoro usando Web Audio API.
 * Gera um sinal sonoro harmônico, limpo e profissional (chime moderno)
 * sem necessidade de arquivos externos ou dependências de rede.
 */

let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextClass();
    }
    
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    
    return sharedAudioContext;
  } catch (err) {
    console.warn('Web Audio API não suportada neste navegador:', err);
    return null;
  }
};

/**
 * Toca um alerta sonoro de notificação com notas harmônicas ascendentes
 * (Dó5 -> Mi5 -> Sol5 -> Dó6) com envelope suave de sino/chime.
 */
export const playNotificationSound = (volume: number = 0.35) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // Acorde harmônico ascendente suave: C5, E5, G5, C6
    const notes = [
      { freq: 523.25, time: 0, duration: 0.18, gain: 0.25 },     // C5
      { freq: 659.25, time: 0.10, duration: 0.20, gain: 0.30 },   // E5
      { freq: 783.99, time: 0.20, duration: 0.24, gain: 0.35 },   // G5
      { freq: 1046.50, time: 0.32, duration: 0.45, gain: 0.30 }   // C6 (sino final)
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      const startTime = now + time;
      const endTime = startTime + duration;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Tipo de onda senoidal com harmônicos limpos
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Curva de ganho: ataque rápido e decaimento exponencial natural
      const maxGain = gain * volume;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(endTime);
    });
  } catch (error) {
    console.error('Falha ao executar alerta sonoro:', error);
  }
};
