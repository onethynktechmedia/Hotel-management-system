// Sound effects for UI interactions
let audioContext: AudioContext | null = null

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  // Resume audio context if suspended (required by browsers)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

export const playClickSound = () => {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  } catch (error) {
    // Ignore audio errors
  }
}

export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 1200
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.2)
  } catch (error) {
    // Ignore audio errors
  }
}

export const playErrorSound = () => {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 300
    oscillator.type = 'sawtooth'
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch (error) {
    // Ignore audio errors
  }
}

export const playPrintSound = () => {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 600
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
  } catch (error) {
    // Ignore audio errors
  }
}

export const playNotificationSound = (type?: 'cart' | 'order' | 'success' | 'default') => {
  try {
    const ctx = getAudioContext()
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime + startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration)

      oscillator.start(ctx.currentTime + startTime)
      oscillator.stop(ctx.currentTime + startTime + duration)
    }

    if (type === 'cart') {
      // Cart add sound - pleasant ding
      playTone(880, 0, 0.2)
      playTone(1100, 0.2, 0.2)
    } else if (type === 'order') {
      // Order created sound - triumphant triple tone
      playTone(880, 0, 0.15)
      playTone(1100, 0.15, 0.15)
      playTone(1320, 0.3, 0.3)
    } else if (type === 'success') {
      // Success sound - ascending tones
      playTone(523, 0, 0.15)
      playTone(659, 0.15, 0.15)
      playTone(784, 0.3, 0.3)
    } else {
      // Default notification - ding-ding-ding
      playTone(880, 0, 0.15)
      playTone(1100, 0.15, 0.15)
      playTone(880, 0.3, 0.3)
    }
  } catch (error) {
    console.error('Notification sound error:', error)
  }
}
