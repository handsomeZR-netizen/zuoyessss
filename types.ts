
export enum ExperimentType {
  THREAD_BASIC = 'THREAD_BASIC',
  PRODUCER_CONSUMER = 'PRODUCER_CONSUMER',
  READER_WRITER = 'READER_WRITER',
  PHILOSOPHERS = 'PHILOSOPHERS',
  APPLE_ORANGE = 'APPLE_ORANGE'
}

export interface LogEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface BufferItem {
  id: number;
  value: number; // Product ID
  producerId: number;
}

export enum ActorState {
  IDLE = 'IDLE',
  WAITING = 'WAITING', // Generic waiting
  WORKING = 'WORKING', // Producing or Consuming or Reading/Writing
  BLOCKED = 'BLOCKED', // Specifically for deadlock simulation
  
  // Specific for Philosophers
  THINKING = 'THINKING',
  HUNGRY = 'HUNGRY',
  EATING = 'EATING',
  HAS_LEFT_FORK = 'HAS_LEFT_FORK'
}

export interface Actor {
  id: number;
  name: string;
  state: ActorState;
  actionCount: number;
}
