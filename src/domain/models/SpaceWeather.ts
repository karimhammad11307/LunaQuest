/** NASA observations are context, never measured radiation at the Moon Base. */
export type DonkiEventType = 'FLR' | 'CME' | 'SEP' | 'notification';

export interface SpaceWeatherObservation {
  id: string;
  type: DonkiEventType;
  observedAt: string;
  /** FLR class (such as M2.1) or notification category when supplied. */
  classification: string | null;
  /** CME analysis speed, if NASA supplied a valid value; not a lunar-dose estimate. */
  speedKmS: number | null;
}

export interface SpaceWeatherReport {
  observations: SpaceWeatherObservation[];
  fetchedAt: string;
  /** True when one or more requested DONKI endpoints failed, but others succeeded. */
  partial: boolean;
}
