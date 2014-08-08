//
//  TangleKit.js
//  Tangle 0.1.0
//
//  Created by Bret Victor on 6/10/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//


(function () {


//----------------------------------------------------------
//
//  TKIf
//
//  Shows the element if value is true (non-zero), hides if false.
//
//  Attributes:  data-invert (optional):  show if false instead.

Tangle.classes.TKIf = {

    initialize: function (element, options, tangle, variable) {
        this.isInverted = !!options.invert;
    },

    update: function (element, value) {
        if (this.isInverted) { value = !value; }
        if (value) { element.style.removeProperty("display"); }
        else { element.style.display = "none" };
    }
};


//----------------------------------------------------------
//
//  TKSwitch
//
//  Shows the element's nth child if value is n.
//
//  False or true values will show the first or second child respectively.

Tangle.classes.TKSwitch = {

    update: function (element, value) {
        element.getChildren().each( function (child, index) {
            if (index != value) { child.style.display = "none"; }
            else { child.style.removeProperty("display"); }
        });
    }
};


//----------------------------------------------------------
//
//  TKSwitchPositiveNegative
//
//  Shows the element's first child if value is positive or zero.
//  Shows the element's second child if value is negative.

Tangle.classes.TKSwitchPositiveNegative = {

    update: function (element, value) {
        Tangle.classes.TKSwitch.update(element, value < 0);
    }
};

//----------------------------------------------------------
//
// TKSelect
//
// Click to switch between a list a given list of child element
// values. Works like TKToggle, but takes a list of child element
// values of any length.

Tangle.classes.TKSelect = {

    initialize: function (element, options, tangle, variable) {
        element.addEvent("click", function (event) {
            var selections = element.getChildren();
            var isActive = tangle.getValue(variable);
            if(isActive < selections.length -1){
                tangle.setValue(variable, isActive + 1);
            } else {
                tangle.setValue(variable, 0);
            }

        });
    }
};

//----------------------------------------------------------
//
//  TKToggle
//
//  Click to toggle value between 0 and 1.

Tangle.classes.TKToggle = {

    initialize: function (element, options, tangle, variable) {
        element.addEvent("click", function (event) {
            var isActive = tangle.getValue(variable);
            tangle.setValue(variable, isActive ? 0 : 1);
        });
    }
};


//----------------------------------------------------------
//
//  TKIncrement
//
//  Click to increment value (modulo the number of options).

Tangle.classes.TKIncrement = {

    initialize: function (element, options, tangle, variable) {
        element.addEvent("click", function (event) {
            var value = tangle.getValue(variable);
            tangle.setValue(variable, ++value % element.getChildren().length);
        });
    },
	
    update: function (element, value) {
        element.getChildren().each( function (child, index) {
            child.style.display = (index != value) ? "none" : "inline";
        });
    }
};


//----------------------------------------------------------
//
//  TKNumberField
//
//  An input box where a number can be typed in.
//
//  Attributes:  data-size (optional): width of the box in characters

Tangle.classes.TKNumberField = {

    initialize: function (element, options, tangle, variable) {
        this.input = new Element("input", {
    		type: "text",
    		"class":"TKNumberFieldInput",
    		size: options.size || 6
        }).inject(element, "top");

        var inputChanged = (function () {
            var value = this.getValue();
            tangle.setValue(variable, value);
        }).bind(this);

        this.input.addEvent("keyup",  inputChanged);
        this.input.addEvent("blur",   inputChanged);
        this.input.addEvent("change", inputChanged);
	},

	getValue: function () {
        var value = parseFloat(this.input.get("value"));
        return isNaN(value) ? 0 : value;
	},

	update: function (element, value) {
	    var currentValue = this.getValue();
	    if (value !== currentValue) { this.input.set("value", "" + value); }
	}
};


//----------------------------------------------------------
//
//  TKAdjustableNumber
//
//  Drag a number to adjust.
//
//  Attributes:  data-min (optional): minimum value
//               data-max (optional): maximum value
//               data-step (optional): granularity of adjustment (can be fractional)

var isAnyAdjustableNumberDragging = false;  // hack for dragging one value over another one

Tangle.classes.TKAdjustableNumber = {

    initialize: function (element, options, tangle, variable) {
        this.element = element;
        this.tangle = tangle;
        this.variable = variable;

        this.min = (options.min !== undefined) ? parseFloat(options.min) : 0;
        this.max = (options.max !== undefined) ? parseFloat(options.max) : 1e100;
        this.step = (options.step !== undefined) ? parseFloat(options.step) : 1;

        this.initializeHover();
        this.initializeHelp();
        this.initializeDrag();
    },


    // hover

    initializeHover: function () {
        this.isHovering = false;
        this.element.addEvent("mouseenter", (function () { this.isHovering = true;  this.updateRolloverEffects(); }).bind(this));
        this.element.addEvent("mouseleave", (function () { this.isHovering = false; this.updateRolloverEffects(); }).bind(this));
    },

    updateRolloverEffects: function () {
        this.updateStyle();
        this.updateCursor();
        this.updateHelp();
    },

    isActive: function () {
        return this.isDragging || (this.isHovering && !isAnyAdjustableNumberDragging);
    },

    updateStyle: function () {
        if (this.isDragging) { this.element.addClass("TKAdjustableNumberDown"); }
        else { this.element.removeClass("TKAdjustableNumberDown"); }

        if (!this.isDragging && this.isActive()) { this.element.addClass("TKAdjustableNumberHover"); }
        else { this.element.removeClass("TKAdjustableNumberHover"); }
    },

    updateCursor: function () {
        var body = document.getElement("body");
        if (this.isActive()) { body.addClass("TKCursorDragHorizontal"); }
        else { body.removeClass("TKCursorDragHorizontal"); }
    },


    // help

    initializeHelp: function () {
        this.helpElement = (new Element("div", { "class": "TKAdjustableNumberHelp" })).inject(this.element, "top");
        this.helpElement.setStyle("display", "none");
        this.helpElement.set("text", "drag");
    },

    updateHelp: function () {
        var size = this.element.getSize();
        var top = -size.y + 7;
        var left = Math.round(0.5 * (size.x - 20));
        var display = (this.isHovering && !isAnyAdjustableNumberDragging) ? "block" : "none";
        this.helpElement.setStyles({ left:left, top:top, display:display });
    },


    // drag

    initializeDrag: function () {
        this.isDragging = false;
        new BVTouchable(this.element, this);
    },

    touchDidGoDown: function (touches) {
        this.valueAtMouseDown = this.tangle.getValue(this.variable);
        this.isDragging = true;
        isAnyAdjustableNumberDragging = true;
        this.updateRolloverEffects();
        this.updateStyle();
    },

    touchDidMove: function (touches) {
        var value = this.valueAtMouseDown + touches.translation.x / 5 * this.step;
        value = ((value / this.step).round() * this.step).limit(this.min, this.max);
        this.tangle.setValue(this.variable, value);
        this.updateHelp();
    },

    touchDidGoUp: function (touches) {
        this.isDragging = false;
        isAnyAdjustableNumberDragging = false;
        this.updateRolloverEffects();
        this.updateStyle();
        this.helpElement.setStyle("display", touches.wasTap ? "block" : "none");
    }
};

//----------------------------------------------------------
//
//  TKInlineSlider
//
//  Drag a slider inline with the text to adjust the value (the slider updates accordingly).
//
//  Attributes:  data-min (optional): minimum value
//               data-max (optional): maximum value
Tangle.classes.TKInlineSlider = {
            initialize: function (element, options, tangle, variable) {
                this.max = options.max || 10;
                this.min = options.min || 0;
                this.width = element.getCoordinates().width;
                this.barElement = (new Element("div", { "class":"TKInlineSliderBar" })).inject(element);
                var updateWithTouches = (function (touches) {
                    var x = touches.event.page.x - element.getPosition().x;
                    var value = Math.round(x / this.width * (this.max - this.min) + this.min);
                    value = value.limit(this.min, this.max);
                    tangle.setValue(variable, value);
                }).bind(this);
                new BVTouchable(element, { touchDidGoDown:updateWithTouches, touchDidMove:updateWithTouches, touchDidGoUp:function(){} });
            },
            update: function (element, value) {
                this.barElement.setStyle("width", Math.round(this.width * (value - this.min) / (this.max - this.min)));
            }
        };

//----------------------------------------------------------
//
//  TKExpandingList
//
//  Click once to show a list of items to chose from; click one of them to chose it and update the values accordingly.
//
//  Attributes:  data-items: items to chose from, separated by a separator (default /). E.g. data-items="shirts/hats/pants"
//               data-separator (optional, defaults to slash /): separator for the items in the data-items string 

Tangle.classes.TKExpandingList = {
            initialize: function (element, options, tangle, variable) {
                var isExpanded = false;
                this.separator = options.separator || "/";
                var items = options.items.split(this.separator);
                
                var subelements = [];
                subelements.push(new Element("span", { text:"[ " }));
                items.each(function (item, index) {
                    var itemElement = new Element("span", { "class":"TKExpandingListItem", text:item });
                    itemElement.onclick = function () { itemWasClicked(item); }
                    subelements.push(itemElement);
                    if (index < items.length - 1) {
                        subelements.push(new Element("span", { text:", " }));
                    }
                });
                subelements.push(new Element("span", { text:" ]" }));
                
                subelements.each(function (subelement) { subelement.inject(element, "bottom"); });
                
                function itemWasClicked (item) {
                    isExpanded = !isExpanded;
                    tangle.setValue(variable, item);
                    update(element,item);  // update expanded, even if variable doesn't change
                }
                
                function update (element, value) {
                    subelements.each(function (subelement) {
                        var text = subelement.get("text");
                        subelement.style.display = (isExpanded || text == value) ? "inline" : "none";
                    });
                }
                this.update = update;
            }
        };
    
    
//----------------------------------------------------------
//
//  TKExpandingSet
//
//  Click to select and deselect items from a list
//
//  Attributes:  data-items: items to chose from, separated by a separator (default /). E.g. data-items="shirts/hats/pants"
//               data-separator (optional, defaults to slash /): separator for the items in the data-items string 
 
    Tangle.classes.TKExpandingSet = {
            initialize: function (element, options, tangle, variable) {
                var isExpanded = false;
                this.separator = options.separator || "/";
                var items = options.items.split(this.separator);
                
                var subelements = [];

                var summaryElement = new Element("span", { "class":"TKExpandingSetSummary" });
                summaryElement.onclick = function () { summaryWasClicked(); }
                subelements.push(summaryElement);
                
                subelements.push(new Element("span", { text:"[ " }));
                items.each(function (item, index) {
                    var itemElement = new Element("span", { "class":"TKExpandingSetItem", text:item });
                    itemElement.onclick = function () { itemWasClicked(item); }
                    subelements.push(itemElement);
                    if (index < items.length - 1) {
                        subelements.push(new Element("span", { text:", " }));
                    }
                });
                subelements.push(new Element("span", { text:" ]" }));
                
                subelements.each(function (subelement) { subelement.inject(element, "bottom"); });
                setExpanded(false);
                
                function isItemSelected (item) {
                    var selectedItems = tangle.getValue(variable);
                    return !!selectedItems[item];
                }

                function setItemSelected (item, selected)  {
                    var newSelectedItems = Object.clone(tangle.getValue(variable));
                    if (selected) { newSelectedItems[item] = true; }
                    else { delete newSelectedItems[item]; }
                    tangle.setValue(variable, newSelectedItems);
                }
                
                function itemWasClicked (item) {
                    setItemSelected(item, !isItemSelected(item));
                }
                
                function summaryWasClicked () {
                    setExpanded(true);
                }
                
                function setExpanded (expanded) {
                    isExpanded = expanded;
                    subelements.each(function (subelement) {
                        subelement.style.display = (subelement === summaryElement ? !expanded : expanded) ? "inline" : "none";
                    });
                }
                
                function update (element, selectedItems) {
                    subelements.each(function (subelement, index) {
                        if (!subelement.hasClass("TKExpandingSetItem")) { return; }
                        var isSelected = !!selectedItems[subelement.get("text")];
                        if (isSelected) { subelement.addClass("TKExpandingSetItemSelected"); }
                        else { subelement.removeClass("TKExpandingSetItemSelected"); }
                    });


                    var summaryText = ""; 
                    if (items.length == 0) {
                        //nothing to show here, nothing was selected
                        summaryText = "";
                    } else if (items.length == 1) {
                        summaryText = items[0];
                    } else if (items.length == 2) {
                        summaryText = items[0] + " and " + items[1];
                    } else {
                        var allButLast = items.slice(0, items.length - 1);
                        summaryText = allButLast.join(", ") + ", and " + items[items.length - 1];
                    }
                    summaryElement.set("text", summaryText);
                }
                this.update = update;
            }
        };
    


//----------------------------------------------------------
//
//  formats
//
//  Most of these are left over from older versions of Tangle,
//  before parameters and printf were available.  They should
//  be redesigned.
//

function formatValueWithPrecision (value,precision) {
    if (Math.abs(value) >= 100) { precision--; }
    if (Math.abs(value) >= 10) { precision--; }
    return "" + value.round(Math.max(precision,0));
}

Tangle.formats.p3 = function (value) {
    return formatValueWithPrecision(value,3);
};

Tangle.formats.neg_p3 = function (value) {
    return formatValueWithPrecision(-value,3);
};

Tangle.formats.p2 = function (value) {
    return formatValueWithPrecision(value,2);
};

Tangle.formats.e6 = function (value) {
    return "" + (value * 1e-6).round();
};

Tangle.formats.abs_e6 = function (value) {
    return "" + (Math.abs(value) * 1e-6).round();
};

Tangle.formats.freq = function (value) {
    if (value < 100) { return "" + value.round(1) + " Hz"; }
    if (value < 1000) { return "" + value.round(0) + " Hz"; }
    return "" + (value / 1000).round(2) + " KHz";
};

Tangle.formats.dollars = function (value) {
    return "$" + value.round(0);
};

Tangle.formats.free = function (value) {
    return value ? ("$" + value.round(0)) : "free";
};

Tangle.formats.percent = function (value) {
    return "" + (100 * value).round(0) + "%";
};

Tangle.formats.height = function (value) {
	return Math.floor(value/12) + "&prime;" + value%12 + "&Prime;";
};

Tangle.formats.default = function (value) { return "" + value; };
Tangle.formats.hidden = function (value) { return ""; };

//----------------------------------------------------------

})();
