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
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import {ModelViewerElement} from '@google/model-viewer/dist/model-viewer';

import { VisualSettings } from "./settings";

export class Visual implements IVisual {
    private target: HTMLElement;
    private modelViewer: Set<ModelViewerElement>;
    private modelViwerDivs: Set<HTMLElement>;
    private parentDiv: HTMLElement;
    private maxViewers: number;
    private visualSettings: VisualSettings;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;

        this.parentDiv = document.createElement("div");
        this.parentDiv.setAttribute("id","model-viewer-div");
        this.parentDiv.setAttribute("class","grid-container");
        this.modelViewer = new Set<ModelViewerElement>();
        this.modelViwerDivs = new Set<HTMLElement>();
        this.target.appendChild(this.parentDiv);

        this.maxViewers = 1;
    }

    @logExceptions()
    public update(options: VisualUpdateOptions) {
        this.visualSettings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);

        // load model:
        let dataView: DataView = options.dataViews[0];
        //let modelUrl: string = <string>dataView.single.value;
        //let modelUrl: string = <string>dataView.single.value;
        let modelUrl: string = "https://cdn.glitch.com/32f1ec0f-1e16-448a-b891-71f24804e417%2FDuck.glb?v=1561641862851";
        if (!modelUrl) {
            return;
        }

        var self = this;
        this.modelViwerDivs?.forEach(function(value,key) {self.parentDiv.removeChild(key);});
        this.maxViewers = this.visualSettings.multiViewers.numberOfViews;
        this.modelViewer.clear();
        this.modelViwerDivs.clear();
        for (let i = 0; i < this.maxViewers; i++) {
            let div: HTMLElement = document.createElement("div");
            this.modelViwerDivs.add(div); 
            let viewer: ModelViewerElement = new ModelViewerElement();
            this.modelViewer.add(viewer);
            div.appendChild(viewer);
            this.parentDiv.appendChild(div);   
            viewer.src = modelUrl;
        }

        /*if (!this.modelViewer[0]) {  
            this.modelViewer = new ModelViewerElement();
            div.appendChild(this.modelViewer);
            this.target.appendChild(div);
        }*/

        // apply settings:
        this.modelViewer.forEach(viewer  => {
            viewer.autoRotate = self.visualSettings.camera.autoRotate;
            viewer.cameraControls = self.visualSettings.camera.controls;
            viewer.style.backgroundColor = self.visualSettings.camera.backgroundColor; 
            viewer.shadowIntensity = self.visualSettings.modelShadow.intensity;
            viewer.shadowSoftness = self.visualSettings.modelShadow.softness;           
        });

        //this.modelViewer.src = "https://cdn.glitch.com/32f1ec0f-1e16-448a-b891-71f24804e417%2FDuck.glb?v=1561641862851";
        //console.log("after model viewer");
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