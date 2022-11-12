console.error("marked-fares worker needs migration from supabase")

// eslint-disable-next-line unicorn/no-process-exit
process.exit(1)

export {}

// import { createClient } from "@supabase/supabase-js"
// import type { Database } from "../types/supabase-types"
// import { MarkedFare } from "../components/SearchResults"
// import dayjs from "dayjs"
// import LocalizedFormat from "dayjs/plugin/localizedFormat"
// import { genQueryClient, search } from "../helpers/awardSearchStandalone"
// import { Listr } from "listr2"
// import { runListrTask } from "../helpers/common"
// import nodemailer from "nodemailer"
// import handlebars from "handlebars"
// import notificationEmail from "../../emails/notification.html?raw"

// dayjs.extend(LocalizedFormat)

// for (const key of ["VITE_BROWSERLESS_AWS_PROXY_URL", "VITE_BROWSERLESS_AWS_PROXY_API_KEY"])
//   if (!Object.keys(import.meta.env).includes(key)) throw new Error(`Missing ${key} environment variable`)

// const sendNotificationEmail = async (transporter: nodemailer.Transporter, html: string, toAddress: string) => {
//   return transporter.sendMail({
//     from: "\"AwardWiz\" <no-reply@awardwiz.com>",
//     to: toAddress,
//     subject: "AwardWiz Notification",
//     priority: "high",
//     html,
//     attachments: [{
//       filename: "wizard.png",
//       path: "src/wizard.png",
//       cid: "wizard.png",
//     }]
//   })
// }

// //////////////////////////////////////

// const markedFaresQuery = await runListrTask("Getting all marked fares...", async () => {
//   return supabase
//     .from("cloudstate")
//     .select("user_id, value")
//     .eq("key", "markedFares")
//     .not("value", "eq", "[]")
//     .throwOnError()
// }, (returnData) => `${returnData.data!.length} found`)

// const emailsQuery = await runListrTask("Getting all emails...", async () => {
//   return supabase
//     .from("users_clone")
//     .select("id, email")
//     .in("id", markedFaresQuery.data!.map(({ user_id }) => user_id))
//     .throwOnError()
// }, () => "done")

// // Add user id and email to each marked fare
// let markedFares = markedFaresQuery.data!.flatMap((item) => {
//   const email = emailsQuery.data!.find((user) => user.id === item.user_id)?.email as string
//   return (item.value as MarkedFare[]).map((markedFare) => ({ ...markedFare, userId: item.user_id, email }))
// })

// // Remove all fares from the past
// const toRemove = new Set(markedFares.filter((markedFare) => dayjs(markedFare.date).isBefore(dayjs().startOf("day"))))
// markedFares = markedFares.filter((markedFare) => !toRemove.has(markedFare))

// // Prep email transport
// const { transporter, template } = await runListrTask("Creating email transport...", async () => {
//   let transporter
//   if (import.meta.env.VITE_SMTP_CONNECTION_STRING) {
//     transporter = nodemailer.createTransport(import.meta.env.VITE_SMTP_CONNECTION_STRING)
//   } else {
//     const testAccount = await nodemailer.createTestAccount()  // use this one for testing
//     transporter = nodemailer.createTransport(`${testAccount.smtp.secure ? "smtps" : "smtp"}://${testAccount.user}:${testAccount.pass}@${testAccount.smtp.host}:${testAccount.smtp.port}`)
//   }

//   await transporter.verify()
//   const template = handlebars.compile(notificationEmail)
//   return { transporter, template }
// }, () => import.meta.env.VITE_SMTP_CONNECTION_STRING ? "using prod SMTP" : "\u001B[33musing test account\u001B[0m")

// const qc = genQueryClient() // Use the same query client for all searches for caching
// await new Listr<{}>(
//   markedFares.filter((markedFare) => markedFare.email === "trivex@gmail.com").map((markedFare) => ({
//     title: `Querying ${markedFare.origin} to ${markedFare.destination} on ${markedFare.date} for ${markedFare.email}`,
//     task: async (_context, task) => {
//       const results = await search({ origins: [markedFare.origin], destinations: [markedFare.destination], departureDate: markedFare.date }, qc)
//       const foundSaver = results.searchResults.some((result) =>
//         result.flightNo === markedFare.checkFlightNo
//         && result.fares.find((fare) => fare.cabin === markedFare.checkCabin && fare.isSaverFare))

//       if ((markedFare.curAvailable ?? false) === foundSaver)
//         return

//       // eslint-disable-next-line no-param-reassign
//       task.title = `${task.title}: ${markedFare.curAvailable ? "available" : "unavailable"} ➡️ ${foundSaver ? "available 🎉" : "unavailable 👎"}`

//       return task.newListr<{}>([{
//         title: "Sending notification email...",
//         task: async (_context2, task2) => {
//           // TODO: make the buttons work
//           const sendResult = await sendNotificationEmail(transporter, template({
//             origin: markedFare.origin,
//             destination: markedFare.destination,
//             date: dayjs(markedFare.date).format("ddd ll"),
//             cabin: `${markedFare.checkCabin.charAt(0).toUpperCase()}${markedFare.checkCabin.slice(1)}`,
//             availability: foundSaver ? "AVAILABLE" : "UNAVAILABLE",
//             availability_color: foundSaver ? "#00aa00" : "#aa0000"
//           }), markedFare.email)

//           // eslint-disable-next-line no-param-reassign
//           task2.title = `${task2.title} ${nodemailer.getTestMessageUrl(sendResult) || sendResult.response}`
//         }
//       }, {
//         title: "Updating db...",
//         task: async (_context2, task2) => {
//           const userMarkedFares = await supabase
//             .from("cloudstate")
//             .select("user_id, value")
//             .eq("key", "markedFares")
//             .eq("user_id", markedFare.userId)
//             .single()

//           const newMarkedFare: MarkedFare = userMarkedFares.data?.value
//             .find((checkMarkedFare: any) => Object.keys(checkMarkedFare).every((checkKey) => (checkMarkedFare as Record<string, any>)[checkKey] === (markedFare as Record<string, any>)[checkKey]))
//           newMarkedFare.curAvailable = foundSaver

//           await supabase
//             .from("cloudstate")
//             .update({value: userMarkedFares.data?.value})
//             .eq("key", "markedFares")
//             .eq("user_id", markedFare.userId)
//             .throwOnError()

//           // eslint-disable-next-line no-param-reassign
//           task2.title = `${task2.title} ok`
//         }
//       }], { rendererOptions: { collapse: false } })
//     },
//     retry: 3,
//   })), { concurrent: 5, exitOnError: false, registerSignalListeners: false, rendererOptions: { collapseErrors: false } }
// ).run()

// console.log("done")

// // eslint-disable-next-line unicorn/no-process-exit
// process.exit(0)   // TODO: this shouldn't be needed, but there's a leak somewhere with the ReactQuery QueryClient or nearby
