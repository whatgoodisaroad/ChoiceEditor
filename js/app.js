var App = {
    Lib:{
        // App.Lib.Choice(name, tag_1, tag_2, ..., tag_n)
        Choice:function(_name) {
            // var _tags = Array.prototype.slice.call(
                // arguments, 
                // 1
            // );
            
            this.length = arguments[1];
            
            this.name = _name;
            //this.tags = _tags;
        },
        
        Selection:function(_name, _idx) {
            this.name = _name;
            this.index = _idx;
        },
        
        NodeType:{
            Empty:0,
            Text:1,
            Choice:2,
            Union:3
        },
        
        Node:function(_type, _props) {
            this.type = _type;
            
            if (_type == App.Lib.NodeType.Text) {
                this.body = _props.body;
            }
            
            else if (_type == App.Lib.NodeType.Choice) {
                this.choiceName = _props.choiceName;
                this.children = _props.children;
            }
            
            else if (_type == App.Lib.NodeType.Union) {
                this.children = _props.children;
            }
        }
    },
    
    parse:function(src) {
        if (src.length) {
        
            var occ = src.indexOf("#");
            
            if (occ == -1) {
                return new App.Lib.Node(
                    App.Lib.NodeType.Text,
                    { body:src }
                );
            }
            
            else {
                var split1 = Haskell.splitAt(occ, src);
                
                var frontNode = new App.Lib.Node(
                    App.Lib.NodeType.Text,
                    { body:split1.fst.join("") }
                );
                
                var occLt = split1.snd.indexOf("<");
                
                if (occLt == -1) {
                    throw "Malformed choice.";
                }
                
                var split2 = Haskell.splitAt(occLt, split1.snd);
                
                var choiceName = Haskell.drop(1, split2.fst).join("");
                
                var ltCounter = 1;
                var counterPos = 1;
                
                while (ltCounter && counterPos < split2.snd.length) {
                    var ch = split2.snd[counterPos];
                    
                         if (ch == "<") { ++ltCounter; }
                    else if (ch == ">") { --ltCounter; }
                    
                    ++counterPos;
                }
                
                if (counterPos == split2.snd.length && ltCounter) {
                    throw "Unbalanced angle brackets.";
                }
                
                var choicesExpr = Haskell.take(
                    counterPos - 2, 
                    Haskell.drop(
                        1, 
                        split2.snd
                    )
                ).join("");
                
                var choiceNode = new App.Lib.Node(
                    App.Lib.NodeType.Choice,
                    { 
                        choiceName:choiceName,
                        //children:choicesExpr.split(",")
                        children:App.parseAlternatives(choicesExpr)
                    }
                );
                
                var backNode = App.parse(
                    Haskell.drop(
                        counterPos,
                        split2.snd
                    )
                );
                
                return new App.Lib.Node(
                    App.Lib.NodeType.Union,
                    { children:[ frontNode, choiceNode, backNode ] }
                );
            }
        }
        else {
            return new App.Lib.Node(
                App.Lib.NodeType.Empty
            );
        }
    },
    
    parseAlternatives:function(src) {
        var alts = [];
        
        var 
            ltCounter = 0, 
            counterPos = 0, 
            accum = "",
            
            altStart = 0;
        
        while (counterPos < src.length) {
            var ch = src[counterPos];
            
            if (ch == "#") {
                var ltOcc = src.indexOf("<", counterPos);
                
                if (ltOcc == -1) {
                    throw "Malformed alternative.";
                }
                
                ltCounter = 1;
                
                counterPos = ltOcc + 1;
                
                while (ltCounter && counterPos < src.length) {
                    var ch2 = src[counterPos];
                    
                         if (ch2 == "<") { ++ltCounter; }
                    else if (ch2 == ">") { --ltCounter; }
                    
                    ++counterPos;
                }
                
                --counterPos;
            }
            
            else if (ch == ",") {
                alts.push(
                    App.parse(
                        src.substring(
                            altStart, 
                            counterPos
                        )
                    )
                );
                
                altStart = counterPos + 1;
            }
            
            counterPos++;
        }
        
        alts.push(
            App.parse(
                src.substring(altStart)
            )
        );
        
        return alts;
    },
    
    parseInput:function() {
        return App.parse(
            $("#editor")[0].innerText
        );
    },
    
    choicesOf:function(node) {
        var res = [];
        
        if (node.type == App.Lib.NodeType.Choice) {
            res = [ 
                new App.Lib.Choice(
                    node.choiceName,
                    node.children.length
                )
            ];
        }
        
        if (node.type == App.Lib.NodeType.Union || node.type == App.Lib.NodeType.Choice) {
            for (var idx = 0; idx < node.children.length; ++idx) {
                Array.prototype.push.apply(
                    res,
                    App.choicesOf(
                        node.children[idx]
                    )
                );
            }
        }
        
        // Remove duplicates:
        for (var idxa = 0; idxa < res.length; ++idxa) {
            var name = res[idxa].name;
            
            for (var idxb = idxa + 1; idxb < res.length; ++idxb) {
                if (name == res[idxb].name) {
                    res[idxa].length = Math.max(
                        res[idxa].length,
                        res[idxb].length
                    );
                    
                    res.splice(idxb, 1);
                }
            }
        }
        
        return res;
    },
    
    updateChoiceList:function() {
        $("#choiceDisplay li:not(.special)").remove();
        
        try {
            var choices = App.choicesOf(App.parseInput());
            
            $.each(
                choices,
                function(idx, choice) {
                    var listItem = $("<li><a></a><ul></ul></li>");
                    
                    var menuId = choice.name + "_menu";
                    
                    listItem
                        .addClass("dropdown")
                        .find("a")
                            .html("Choice " + choice.name + "<b class=\"caret\"></b>")
                            .attr("data-choice-name", choice.name)
                            .addClass("dropdown-toggle")
                            .attr("data-toggle", "dropdown");
                            //.attr("href", "#" + menuId);
                    
                    var ul = listItem
                        .find("ul")
                            .addClass("dropdown-menu")
                            .attr("id", menuId);
                            
                    for (var idx = 0; idx < choice.length; ++idx) {
                        $("<li><a/></li>")
                            .find("a")
                                .attr("href", "#_")
                                .text("Alternative " + (idx + 1))
                                .attr("data-alternative-index", idx)
                                .on(
                                    "click",
                                    function() {
                                        var 
                                            choiceName = $(this)
                                                .parents(".dropdown")
                                                .find(".dropdown-toggle")
                                                    .attr("data-choice-name"),
                                            alternativeIndex = $(this)
                                                .attr("data-alternative-index");
                                        
                                        App.updateSelection(
                                            choiceName, 
                                            alternativeIndex
                                        );
                                        
                                        App.updateSelectionDisplay();
                                    }
                                )
                                .addClass("alternativeLink")
                                .end()
                            .appendTo(ul);
                    }
                        
                    listItem
                        .find("a")
                            .dropdown()
                            .end()
                        .appendTo("#choiceDisplay");
                }
            );
            
            for (var idx = 0; idx < App.currentSelection.length; ++idx) {
                var name = App.currentSelection[idx].name;
                
                if (!$(".dropdown-toggle[data-choice-name='" + name + "']").length) {
                    App.currentSelection.splice(idx, 1);
                }
            }
            
        }
        
        catch (exc) {
            $("<li><a/></li>")
                .find("a")
                    .attr("href", "#_")
                    .text(exc || "Unknown")
                    .end()
                .addClass("exceptionDisplay")
                .appendTo("#choiceDisplay");
        }
    },
    
    defaultSelection:function(node) {
        if (node.type == App.Lib.NodeType.Text) {
            return node.body;
        }
        
        else if (node.type == App.Lib.NodeType.Choice && 
            node.children.length) {
            return App.defaultSelection(
                node.children[0]
            );
        }
        
        else if (node.type == App.Lib.NodeType.Union) {
            return Haskell.map(
                App.defaultSelection,
                node.children
            )
            .join("");
        }
        
        else return "";
    },
    
    selectionByName:function(name, selection) {
        for (var idx = 0; idx < selection.length; ++idx) {
            if (selection[idx].name == name) {
                return selection[idx].index;
            }
        }
        
        return null;
    },
    
    evalSelection:function(node, selection) {
        if (node.type == App.Lib.NodeType.Text) {
            return node.body;
        }
        
        else if (node.type == App.Lib.NodeType.Choice) {
            
            var sel = App.selectionByName(
                node.choiceName, 
                selection
            );
            
            if (sel == null) {
                throw "Unselected choice";
            }
            
            if (sel > node.children.length) {
                throw "Choice has insufficient alternatives for dimension.";
            }
            
            return App.evalSelection(
                node.children[sel],
                selection
            );
        }
        
        else if (node.type == App.Lib.NodeType.Union) {
            return Haskell.map(
                function(node) {
                    return App.evalSelection(node, selection);
                },
                node.children
            )
            .join("");
        }
        
        else return "";
    },
    
    currentSelection:[],
    
    updateSelection:function(name, selectionIndex) {
        for (var idx = 0; idx < App.currentSelection.length; ++idx) {
            if (App.currentSelection[idx].name == name) {
                App.currentSelection[idx].index = selectionIndex;
                
                return;
            }
        }
        
        App.currentSelection.push(
            new App.Lib.Selection(
                name, 
                selectionIndex
            )
        );
    },
    
    updateSelectionDisplay:function() {
        $("#selectionDisplay").text(
            "{ " +
            $.map(
                App.currentSelection,
                function(elem) {
                    return elem.name + "." + elem.index;
                }
            )
            .join(", ") +
            " }"
        );
    }
};


$(function() {
    $("#editor")
        .on("keyup", function() {
            App.updateChoiceList();
        })
        .trigger("keyup");
    
    $("#ccButton").on("click", function() {
        try {
            var evaluation = App.evalSelection(
                App.parseInput(),
                App.currentSelection
            );
                    
        
            $("#resolve .modal-body pre")
                .text(
                    evaluation
                );
        }
        catch(exc) {
            $("#resolve .modal-body pre")
                .text(
                    "Failed evaluating: " + exc
                );
        }
        
        $("#resolve").modal({ show:true });
            
        return false;
    });
    
});
