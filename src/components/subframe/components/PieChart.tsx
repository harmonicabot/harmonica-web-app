"use client";
/*
 * Documentation:
 * Pie Chart — https://app.subframe.com/4e2c4e6050a0/library?component=Pie+Chart_0654ccc7-054c-4f3a-8e9a-b7c81dd3963c
 */

import React from "react";
import * as SubframeCore from "@subframe/core";
import * as SubframeUtils from "../utils";

interface PieChartRootProps
  extends React.ComponentProps<typeof SubframeCore.PieChart> {
  className?: string;
}

const PieChartRoot = React.forwardRef<
  React.ElementRef<typeof SubframeCore.PieChart>,
  PieChartRootProps
>(function PieChartRoot({ className, ...otherProps }: PieChartRootProps, ref) {
  return (
    <SubframeCore.PieChart
      className={SubframeUtils.twClassNames("h-52 w-52", className)}
      ref={ref}
      colors={[
        "#eab308",
        "#fef08a",
        "#ca8a04",
        "#fde047",
        "#a16207",
        "#facc15",
      ]}
      {...otherProps}
    />
  );
});

export const PieChart = PieChartRoot;
