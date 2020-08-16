/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";


import 'regenerator-runtime';

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import DataViewTableRow = powerbi.DataViewTableRow;
import PrimitiveValue = powerbi.PrimitiveValue;
import ISelectionId = powerbi.extensibility.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;

import {ModelViewerElement} from '@google/model-viewer/dist/model-viewer';

import { VisualSettings } from "./settings";

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    private modelViewers: Set<ModelViewer>;
    private parentDiv: HTMLElement;
    private visualSettings: VisualSettings;
    private selectionManager: ISelectionManager;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;

        this.parentDiv = document.createElement("div");
        this.parentDiv.setAttribute("id","model-viewer-div");
        var self = this;
        this.parentDiv.addEventListener("click", (mouseEvent) => {
            self.selectionManager.clear();
        });

        this.modelViewers = new Set<ModelViewer>();
        this.target.appendChild(this.parentDiv);
        this.selectionManager = this.host.createSelectionManager();
    }

    @logExceptions()
    public update(options: VisualUpdateOptions) {
        this.visualSettings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);

        var self = this;
        this.modelViewers.forEach(function(value,key) {self.parentDiv.removeChild(key.Div);});
 
        // load model:
        let dataView: DataView = options.dataViews[0];
        this.modelViewers.clear();
        dataView.table.rows.forEach((row: DataViewTableRow, rowIndex: number) => {
            let index: number = 0;
            let viewer: ModelViewer = new ModelViewer();
            this.modelViewers.add(viewer);  

            viewer.SelectionId = this.host.createSelectionIdBuilder()
            .withTable(dataView.table, rowIndex)
            .createSelectionId();

            row.forEach((columnValue: PrimitiveValue) => {
                if (dataView.table.columns[index].roles["sources"]) {
                    let modelUrl: string = columnValue.toString();
                    //modelUrl = "https://cdn.glitch.com/32f1ec0f-1e16-448a-b891-71f24804e417%2FDuck.glb?v=1561641862851";
                    viewer.SrcPath = modelUrl;
                } else if (dataView.table.columns[index].roles["names"]) {
                    viewer.Name = columnValue.toString();
                }
                index++;
            })
        });

        // update modelViewers:
        this.modelViewers.forEach(function(value,key) {
            value.Div = document.createElement("div");
            value.Div.addEventListener("click", (mouseEvent) => {
                self.selectionManager.select(value.SelectionId);
                mouseEvent.stopPropagation();
            });
            value.Viewer = new ModelViewerElement();
            value.Div.appendChild(value.Viewer);
            self.parentDiv.appendChild(value.Div);
            value.Viewer.src = value.SrcPath;
                   
            if (value.Name) {
                const new_p: HTMLElement = document.createElement("p");
                new_p.appendChild(document.createTextNode(value.Name));
                value.Viewer.appendChild(new_p);    
            }
   
            value.Viewer.minimumRenderScale = 1.0;

            value.Viewer.autoRotate = self.visualSettings.camera.autoRotate;
            value.Viewer.cameraControls = self.visualSettings.camera.controls;
            value.Viewer.style.backgroundColor = self.visualSettings.camera.backgroundColor; 
            value.Viewer.shadowIntensity = self.visualSettings.modelShadow.intensity;
            value.Viewer.shadowSoftness = self.visualSettings.modelShadow.softness;
        });

        // If there's only one viewer, make it fill the visual: 
        if (this.modelViewers.size <= 1) {
            this.parentDiv.setAttribute("class","grid-container-single");
        } else {
            this.parentDiv.setAttribute("class","grid-container");
        }
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.visualSettings || VisualSettings.getDefault(), options);
    }
}

export function logExceptions(): MethodDecorator {
    return function (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> {
        return {
            value: function () {
                try {
                    return descriptor.value.apply(this, arguments);
                } catch (e) {
                    console.error(e);
                    throw e;
                }
            }
        }
    }
}

class ModelViewer {
    public SrcPath: string;
    public Name: string;
    public Viewer: ModelViewerElement;
    public Div: HTMLElement;
    public SelectionId: ISelectionId;
}   