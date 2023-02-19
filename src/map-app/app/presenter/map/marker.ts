import { Dictionary, Point2d } from '../../../common_types';
import { EventBus } from '../../../eventbus';
import { InitiativeRenderFunction } from '../../model/config_schema';
import { DataServices } from '../../model/dataservices';
import { Initiative } from '../../model/initiative';
import { BasePresenter } from '../../presenter';
import { MapMarkerView } from '../../view/map/marker';

export class MapMarkerPresenter extends BasePresenter {
  readonly labels: Dictionary;
  constructor(readonly view: MapMarkerView,
              readonly dataServices: DataServices,
              readonly popup: InitiativeRenderFunction) {
    super();
    this.labels = dataServices.getFunctionalLabels();
    this.popup = popup;
  }

  notifySelectionToggled(initiative: Initiative): void {
    EventBus.Marker.selectionToggled.pub(initiative);
  }

  notifySelectionSet(initiative: Initiative): void {
    EventBus.Marker.selectionSet.pub(initiative);
  }

  getLatLng(initiative: Initiative): Point2d {
    return [initiative.lat, initiative.lng];
  }

  getHoverText(initiative: Initiative): string {
    return initiative.name;
  }

  prettyPhone(tel: string): string {
    return tel.replace(/^(\d)(\d{4})\s*(\d{6})/, "$1$2 $3");
  }
  
  getInitiativeContent(initiative: Initiative): string {
    return this.popup(initiative, this.dataServices);
  }

  getMarkerColor(initiative: Initiative): string {
    const hasWww = initiative.www && initiative.www.length > 0;
    const hasReg = initiative.regorg && initiative.regorg.length > 0;
    const markerColor =
      hasWww && hasReg ? "purple" : hasWww ? "blue" : hasReg ? "red" : "green";
    return markerColor;
  }
}
