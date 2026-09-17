// Notification sound utility using Web Audio API
// Generates pleasant, professional notification sounds

let audioContext: AudioContext | null = null
let audioInitialized = false

const getAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      console.log('AudioContext created:', audioContext.state)
    } catch (error) {
      console.error('Failed to create AudioContext:', error)
    }
  }
  return audioContext
}

const playTone = (ctx: AudioContext, frequency: number, startTime: number, duration: number, volume: number = 0.3) => {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startTime)
  
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

export const playNotificationSound = async (type: 'new_order' | 'order_ready' | 'order_completed' | 'order_served' | 'order_confirmed' | 'default' = 'default') => {
  try {
    const ctx = getAudioContext()
    
    if (!ctx) {
      console.error('AudioContext not available')
      return
    }

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      console.log('Resuming suspended AudioContext')
      await ctx.resume()
    }

    console.log('Playing notification sound:', type, 'Context state:', ctx.state)

    const now = ctx.currentTime
    const volume = 0.25

    switch (type) {
      case 'new_order':
        // Pleasant two-tone notification
        playTone(ctx, 587.33, now, 0.15, volume) // D5
        playTone(ctx, 880, now + 0.12, 0.18, volume) // A5
        break

      case 'order_ready':
        // Pleasant chime
        playTone(ctx, 659.25, now, 0.12, volume) // E5
        playTone(ctx, 783.99, now + 0.1, 0.12, volume) // G5
        playTone(ctx, 987.77, now + 0.2, 0.16, volume) // B5
        break

      case 'order_completed':
      case 'order_served':
        // Success sound - ascending major chord
        playTone(ctx, 523.25, now, 0.15, volume) // C5
        playTone(ctx, 659.25, now + 0.12, 0.15, volume) // E5
        playTone(ctx, 783.99, now + 0.24, 0.2, volume) // G5
        break

      case 'order_confirmed':
        // Gentle confirmation sound
        playTone(ctx, 440, now, 0.12, volume * 0.8) // A4
        playTone(ctx, 554.37, now + 0.1, 0.15, volume * 0.8) // C#5
        break

      default:
        // Simple pleasant ping
        playTone(ctx, 880, now, 0.2, volume) // A5
    }

    audioInitialized = true
  } catch (error) {
    console.error('Error playing notification sound:', error)
  }
}

// Request audio context unlock (for browsers that require user interaction)
export const requestAudioPermission = async () => {
  try {
    const ctx = getAudioContext()
    if (!ctx) {
      console.error('AudioContext not available for permission request')
      return false
    }
    
    if (ctx.state === 'suspended') {
      console.log('Requesting audio permission - resuming context')
      await ctx.resume()
      console.log('AudioContext resumed:', ctx.state)
    }
    
    audioInitialized = true
    return true
  } catch (error) {
    console.error('Error requesting audio permission:', error)
    return false
  }
}

// Test function to verify audio is working
export const testSound = () => {
  console.log('Testing notification sound...')
  playNotificationSound('default')
}
