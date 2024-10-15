  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
  import { Eye } from "lucide-react"
  import { HRMarkdown } from "@/components/HRMarkdown"
  
  interface SessionResultSummaryProps {
    summary: string
    sessionData?: any
  }
  
  export default function SessionResultSummary({ summary, sessionData }: SessionResultSummaryProps) {
    
    function extractKeyTakeaways(summary: string): string {
      // Regular expression to match text between "Key Takeaways**" and "💡 **Details**"
      const regex = /Key Takeaways\*\*([\s\S]*?) \*\*Details\*\*/;
  
      // Extract the matched text
      const match = summary.match(regex);
  
      if (match && match[1]) {
        return cleanedText(match[1]);
      } else {
        return 'No match found';
      }
    }
    
    function cleanedText(text: string): string {
      return text
        .replace(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
          ''
        )
        .trim();
    }
  
    function extractDetails(summary: string): string {
      // Regular expression to match text after "💡 **Details**"
      const regex = / \*\*Details\*\*([\s\S]*)/;
  
      // Extract the matched text
      const match = summary.match(regex);
  
      if (match && match[1]) {
        return cleanedText(match[1]);
      } else {
        return 'No match found';
      }
    }

    return (
      <>
      {/* <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle className="text-md">Key Stats</CardTitle>
              <Settings />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>126</CardTitle>
                  <CardDescription>Messages</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>14</CardTitle>
                  <CardDescription>
                    Ave. words per response
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {sessionData.active}
                  </CardTitle>
                  <CardDescription>Finished</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </CardContent>
        </Card>
        <div className="flex mt-4 gap-4">
          <div className="flex flex-col w-1/2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle className="text-md">
                    Results Summary
                  </CardTitle>
                  <Settings />
                </div>
              </CardHeader>
              <CardContent>
                <HRMarkdown text={extractDetails(summary)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle className="text-md">Sentiments</CardTitle>
                  <Settings />
                </div>
              </CardHeader>
              <CardContent>
                The tone of participants was optimisic though they
                shared concern
              </CardContent>
            </Card>
          </div>
          <Card className="w-1/2">
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle className="text-md">Key takeaways</CardTitle>
                <Settings />
              </div>
            </CardHeader>
            <CardContent>
              {sessionData?.summary && (
                <>
                  <HRMarkdown text={extractKeyTakeaways(sessionData.summary)} />
                </>
              )}
            </CardContent>
          </Card>
        </div> */}
      <Card className="h-full"> 
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-md">Your Report</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {summary && (
            <>
              <p className="text-xl font-semibold mb-2">Key Takeaways</p>
              <HRMarkdown text={extractKeyTakeaways(summary)} />
              <p className="text-xl font-semibold mt-6 mb-2">Summary</p>
              <HRMarkdown text={extractDetails(summary)} />
            </>
          )}
        </CardContent>
      </Card> </>
    )
  }