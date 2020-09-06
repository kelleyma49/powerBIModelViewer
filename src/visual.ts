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
    private modelViewers: Map<string,ModelViewer>;
    private parentDiv: HTMLElement;
    private visualSettings: VisualSettings;
    private selectionManager: ISelectionManager;
    private focusedModelViewer: ModelViewer;

    // the following SVGs were taken from http://fontawesome.com
    // license: https://fontawesome.com/license
    private expandIconSvg = '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="expand-alt" class="svg-inline--fa fa-expand-alt fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M212.686 315.314L120 408l32.922 31.029c15.12 15.12 4.412 40.971-16.97 40.971h-112C10.697 480 0 469.255 0 456V344c0-21.382 25.803-32.09 40.922-16.971L72 360l92.686-92.686c6.248-6.248 16.379-6.248 22.627 0l25.373 25.373c6.249 6.248 6.249 16.378 0 22.627zm22.628-118.628L328 104l-32.922-31.029C279.958 57.851 290.666 32 312.048 32h112C437.303 32 448 42.745 448 56v112c0 21.382-25.803 32.09-40.922 16.971L376 152l-92.686 92.686c-6.248 6.248-16.379 6.248-22.627 0l-25.373-25.373c-6.249-6.248-6.249-16.378 0-22.627z"></path></svg>';
    private compressIconSvg = '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="compress-alt" class="svg-inline--fa fa-compress-alt fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M4.686 427.314L104 328l-32.922-31.029C55.958 281.851 66.666 256 88.048 256h112C213.303 256 224 266.745 224 280v112c0 21.382-25.803 32.09-40.922 16.971L152 376l-99.314 99.314c-6.248 6.248-16.379 6.248-22.627 0L4.686 449.941c-6.248-6.248-6.248-16.379 0-22.627zM443.314 84.686L344 184l32.922 31.029c15.12 15.12 4.412 40.971-16.97 40.971h-112C234.697 256 224 245.255 224 232V120c0-21.382 25.803-32.09 40.922-16.971L296 136l99.314-99.314c6.248-6.248 16.379-6.248 22.627 0l25.373 25.373c6.248 6.248 6.248 16.379 0 22.627z"></path></svg>';
    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;

        this.parentDiv = document.createElement("div");
        this.parentDiv.setAttribute("id","model-viewer-div");
        var self = this;
        this.parentDiv.addEventListener("click", (mouseEvent) => {
            self.selectionManager.clear();
        });

        this.modelViewers = new Map<string,ModelViewer>();
        this.target.appendChild(this.parentDiv);
        this.selectionManager = this.host.createSelectionManager();
    }

    @logExceptions()
    public update(options: VisualUpdateOptions) {
        this.visualSettings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);

        var self = this;
 
        // load model:
        let dataView: DataView = options.dataViews[0];

        let newSrcs: Array<[string,string,string,ISelectionId]> = new Array<[string,string,string,ISelectionId]>();

        dataView.table.rows.forEach((row: DataViewTableRow, rowIndex: number) => {
            let index: number = 0;
            var srcPath: string = null;
            var srcName: string = null;
            var posterPath: string = null;

            row.forEach((columnValue: PrimitiveValue) => {
                if (dataView.table.columns[index].roles["sources"]) {
                    let modelUrl: string = columnValue.toString();
                    //modelUrl = "https://cdn.glitch.com/32f1ec0f-1e16-448a-b891-71f24804e417%2FDuck.glb?v=1561641862851";
                    srcPath = modelUrl;
                } else if (dataView.table.columns[index].roles["names"]) {
                    srcName = columnValue.toString();
                }  else if (dataView.table.columns[index].roles["posters"]) {
                    posterPath = columnValue.toString();
                }
                index++;
            });

            let selectionId: ISelectionId = self.host.createSelectionIdBuilder()
            .withTable(dataView.table, rowIndex)
            .createSelectionId();
           
            if (srcPath) {
                newSrcs.push([srcPath,srcName,posterPath,selectionId]);
            }
        });

        if (newSrcs.length == 0) {
            return;
        }

        // transfer previously loaded viewers and allocated new viewers:
        let newViewers: Map<string,ModelViewer> = new Map<string,ModelViewer>();
        let foundFocused: boolean = false;
        newSrcs.forEach(element => {
            let found: ModelViewer = self.modelViewers.get(element[0]);
            if (found) {
                self.modelViewers.delete(element[0]);
            } else {
                found = new ModelViewer();
                found.SrcPath = element[0];
                found.Viewer = new ModelViewerElement();
                found.Div = document.createElement("div");
                self.parentDiv.appendChild(found.Div);
                found.Div.appendChild(found.Viewer);
                found.Viewer.src = found.SrcPath;

                // initially don't display:
                found.Div.style.display = "none";

                found.ExpandButton = document.createElement("button");
                found.ExpandButton.className = "expand-button";
                found.ExpandButton.addEventListener("click", (mouseEvent) => {
                    self.toggleExpandShape(found);
                    mouseEvent.stopPropagation();
                });

                found.ExpandIconSvg = document.createElement(null);
                found.ExpandIconSvg.innerHTML = self.expandIconSvg;
                found.ExpandButton.appendChild(found.ExpandIconSvg);
                found.Viewer.appendChild(found.ExpandButton);
            }

            newViewers.set(element[0],found);
            found.Name = element[1];
            found.PosterPath = element[2];
            found.SelectionId = element[3];
            
            // setup name tag:
            if (found.Name) {
                if (!found.NameText) {
                    found.NameParagraph = document.createElement("p");
                    found.NameText = document.createTextNode(found.Name);
                    found.NameParagraph.appendChild(found.NameText);
                    found.Viewer.appendChild(found.NameParagraph);         
                } else {
                    found.NameText.textContent = found.Name;
                }
            } else if (found.NameText) {
                found.Viewer.removeChild(found.NameParagraph);
                found.NameText = null;
                found.NameParagraph = null;
            }
            
            if (self.focusedModelViewer == found) 
                foundFocused = true;
        });

        // focused was removed - make sure all views are visible:
        if (!foundFocused) {
            this.focusedModelViewer = null;
            newViewers.forEach((value,key) => {
                value.Div.style.display = "initial";
            });
        } 
        // clean up previous viewers:
        this.modelViewers.forEach((value,key) => self.parentDiv.removeChild(value.Div) );
        this.modelViewers.clear();
        this.modelViewers = newViewers;

        // update modelViewers:
        this.modelViewers.forEach((value,key) => {
            // update click handler as selection id might have changed:
            if (value.SelectListener) {
                value.Div.removeEventListener("click", value.SelectListener);
            }
            value.SelectListener = (mouseEvent) => {
                self.selectionManager.select(value.SelectionId);
                mouseEvent.stopPropagation();
            }
            value.Div.addEventListener("click", value.SelectListener);
                   
            value.Viewer.minimumRenderScale = 1.0;

            value.Viewer.poster = value.PosterPath;
            value.Viewer.loading = self.visualSettings.interaction.loading;
            value.Viewer.reveal = self.visualSettings.interaction.reveal;
            value.Viewer.autoRotate = self.visualSettings.camera.autoRotate;
            value.Viewer.cameraControls = self.visualSettings.camera.controls;
            value.Viewer.style.backgroundColor = self.visualSettings.camera.backgroundColor; 
            value.Viewer.shadowIntensity = self.visualSettings.modelShadow.intensity;
            value.Viewer.shadowSoftness = self.visualSettings.modelShadow.softness;
        });
 
        let hasMultipleViewers = this.modelViewers.size > 1; 
        if (hasMultipleViewers && !this.focusedModelViewer)
            this.setParentDivClass(true);
        else if (!hasMultipleViewers) {
            this.setParentDivClass(false);
        }

        this.modelViewers.forEach((value,key) => { 
            value.ExpandButton.style.display = hasMultipleViewers?
                "initial":"none";
        });  
    }

    private toggleExpandShape(viewer: ModelViewer)
    {
        if (!this.focusedModelViewer) {
            this.focusedModelViewer = viewer;
            var self = this;
            this.modelViewers.forEach((value,key) => {
                if (value.Viewer != self.focusedModelViewer.Viewer) {
                    value.Div.style.display = "none";
                } else {
                    value.ExpandIconSvg.innerHTML = self.compressIconSvg;
                }
            });
            this.setParentDivClass(false);
        } else {
            this.focusedModelViewer = null;
  
            var self = this;
            this.modelViewers.forEach((value,key) => {
                value.Div.style.display = "initial";
                value.ExpandIconSvg.innerHTML = self.expandIconSvg;
            });
            this.setParentDivClass(this.modelViewers.size > 1);
        }
    }

    private setParentDivClass(multipleViewers: boolean)
    {
        this.parentDiv.setAttribute("class",multipleViewers?"grid-container":"grid-container-single");
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
    public PosterPath: string;
    public SrcPath: string;
    public Name: string;
    public Viewer: ModelViewerElement;
    public Div: HTMLElement;
    public SelectionId: ISelectionId;
    public NameText: Text;
    public NameParagraph: HTMLElement;
    public ExpandButton: HTMLButtonElement;
    public ExpandIconSvg: HTMLElement;
    public SelectListener: { (event: MouseEvent): void };
}   