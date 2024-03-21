export type TanStackQueryCacheEventType = "added" | "removed" | "updated" | "observerAdded" | "observerRemoved" | "observerResultsUpdated" | "observerOptionsUpdated";

type NotifyEventQueryAdded = { 
  type: 'added';
  query: any;
} 
 
type NotifyEventQueryRemoved = { 
  type: 'removed';
  query: any;
} 
 
type NotifyEventQueryUpdated = { 
  type: 'updated';
  query: any;
  action: any;
} 
 
type NotifyEventQueryObserverAdded = { 
  type: 'observerAdded';
  query: any;
  observer: any;
} 
 
type NotifyEventQueryObserverRemoved = { 
  type: 'observerRemoved';
  query: any; 
  observer: any;
} 
 
type NotifyEventQueryObserverResultsUpdated = { 
  type: 'observerResultsUpdated';
  query: any;
} 
 
type NotifyEventQueryObserverOptionsUpdated = { 
  type: 'observerOptionsUpdated';
  query: any;
  observer: any;
}

export type TanStackQueryCacheEvent = 
  NotifyEventQueryAdded | 
  NotifyEventQueryRemoved | 
  NotifyEventQueryUpdated |
  NotifyEventQueryObserverAdded |
  NotifyEventQueryObserverRemoved |
  NotifyEventQueryObserverResultsUpdated |
  NotifyEventQueryObserverOptionsUpdated;