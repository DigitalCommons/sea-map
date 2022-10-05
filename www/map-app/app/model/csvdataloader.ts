import type { Dictionary } from '../../common_types';

import {
  DataLoader,
  DataConsumer,
} from './dataloader';

import {
  InitiativeObj,
  PropDef,
  PropDefs,
} from './dataservices';

import {
  Config,
} from './config';

import {
  ObjTransform,
  ObjTransformFunc,
  mkObjTransformer,
  Transforms as T,
} from '../../obj-transformer';

import {
  parse,
  ParseError,
  ParseRemoteConfig,
  ParseResult,
  ParseStepResult,
  Parser as PapaParser,
} from "papaparse";


export class CsvDataLoader<R extends object = string[]> implements DataLoader {
  constructor(readonly id: string, readonly url: string, readonly rowTransform: ObjTransformFunc<R,InitiativeObj>) {}
  
  load<T extends DataConsumer>(dataConsumer: T): Promise<this> {
    const executor = (resolve: (v: this | PromiseLike<this>) => void , reject: (r?: any) => void) => {
      const onStep = (result: ParseStepResult<R>, parser: PapaParser) => {
        if (result.errors.length == 0) {
          // console.debug("CsvDataLoader step", results.data);
          const initiative = this.rowTransform(result.data);
          dataConsumer.addBatch(this.id, [initiative])
        }
        else {
          // console.debug("CsvDataLoader step error", results.errors);
          result.errors
            .filter((e): e is ParseError => !!e)
            .forEach(e => reject(e));
        }
      };
      const onComplete = (results: ParseResult<R>) => {
        // console.debug("CsvDataLoader complete", results);
        resolve(this);
      };
      const onError = (error: Error) => {
        // console.log("error", error);
        reject(error);
      };
      const config: ParseRemoteConfig<R> = {
	      download: true,
	      header: true,
        step:  onStep,
        complete: onComplete,
        error: onError,
      };
      parse(this.url, config);
    };
    return new Promise<this>(executor) // Executes executor asynchronously
    // and handle resolutions once
      .then((val) => { dataConsumer.complete(this.id); return val; },
            (error: Error) => { dataConsumer.fail(this.id, error); return this; })
  }
}
