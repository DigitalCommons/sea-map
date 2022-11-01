import type {
  Dictionary
} from '../../common_types';

import type {
  Initiative,
  InitiativeObj,
} from './dataservices';

import {
  sortInitiatives,
} from './dataservices';

// For loading InitiativeObj data incrementally
//
// A variety of the visitor pattern. The details of what is done by the
// consumer is abstracted, and so up to the implementation.
export interface DataConsumer {
  // Add a batch of data. May be called multiple times.
  addBatch(datasetId: string, initiatives: InitiativeObj[]): void;

  // Finishes the load successfully after all data has been seen
  complete(datasetId: string): void;

  // Finishes the load unsuccessfully after an error occurs  
  fail(datasetId: string, error: Error): void;
}

export class AggregatedData {
  
  // An index of URIs to the initiative with that URI
  readonly initiativesByUid: Dictionary<Initiative> = {};

  // An index of property titles to property values to lists of initiatives with that property value 
  readonly registeredValues: Dictionary<Dictionary<Initiative[]>> = {};

  /// An index of property titles to lists of Initiatives with that property
  readonly allRegisteredValues: Dictionary<Initiative[]> = {};
  
  /// An list of all initiatives
  readonly loadedInitiatives: Initiative[] = [];

  // An index of vocab URIs (of those filterableFields which are vocabs) to the referencing property ID (from the filterableFields)
  // FIXME is this not going to be losing information when filterableFields have two items with the same vocab?
  readonly vocabFilteredFields: Dictionary = {};
  
  // Searches loadedInitiatives for objects whose searchstr fields include the search text
  //
  // @return a list sorted by the name field.
  search(text: string): Initiative[] {
    // returns an array of sse objects whose name contains the search text
    var up = text.toUpperCase();
    return this.loadedInitiatives.filter(
      (i: Initiative) => i.searchstr.includes(up)
    ).sort((a: Initiative, b: Initiative) => sortInitiatives(a, b));
  }  
}

// For loading Datsets using a DataConsumer
//
// This is explicitly intended to construct an instance of AggregatedData,
// which is returned via the promise.
export interface DataLoader {

  // Get the dataset ID this dataloader handles
  get id(): string;
  
  // Asynchronously load the dataset given, passing it to the dataConsumer.
  //
  // @param [T] dataConsumer - a DataConsumer object to feed the data
  // to incrementally.
  //
  // Individual datasets' success is signalled by callng
  // dataConsumer.complete(), and failure is signalled via
  // dataConsumer.fail()
  //
  // @returns a promise containing the dataConsumer which resolves when all
  // datasets are fully loaded and processed by the consumer
  //
  // @throws [Error] when an error occurs, which will be a
  // DataLoaderError when associated with a dataset.
  load<T extends DataConsumer>(dataConsumer: T): Promise<this>;

  // Subtypes of this class can expose metadata discovered during the load here
  // (possibly suitably narrowed)
  meta?: unknown;
}

// A DataLoader error which can be connected to a particular dataset loader.
export class DataLoaderError<T extends DataLoader> extends Error {
  constructor(message: string, readonly loader: T) {
    super(message);
  }
}

